import { neon } from '@neondatabase/serverless';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const sql = neon(process.env.NEON_DATABASE_URL);

  try {
    const body = JSON.parse(event.body || '{}');
    const { dogId, dogName, fullName, pickupTime, remarks = null } = body;

    if (!dogId || !dogName || !fullName || !pickupTime) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const [row] = await sql`
      INSERT INTO adoptions (dog_id, dog_name, full_name, pickup_time, remarks)
      VALUES (${dogId}, ${dogName}, ${fullName}, ${new Date(pickupTime)}, ${remarks})
      RETURNING id, dog_id, dog_name, full_name, pickup_time, remarks, created_at
    `;

    return { statusCode: 201, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(row) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server error' }) };
  }
}
