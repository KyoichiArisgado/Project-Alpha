import { neon } from '@neondatabase/serverless';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const sql = neon(process.env.NEON_DATABASE_URL);

  try {
    if (event.httpMethod === 'GET') {
      const rows = await sql`SELECT id, name, breed, birthdate, age, description, image_url, gif_url, attributes, parents, created_at FROM dogs ORDER BY created_at DESC`;
      return { statusCode: 200, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(rows) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const {
        name,
        breed,
        birthdate = null,
        age = null,
        description,
        imageUrl = null,
        gifUrl = null,
        attributes,
        parents = null
      } = body;

      if (!name || !breed || !description || !attributes) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
      }

      const [row] = await sql`
        INSERT INTO dogs (name, breed, birthdate, age, description, image_url, gif_url, attributes, parents)
        VALUES (${name}, ${breed}, ${birthdate ? new Date(birthdate) : null}, ${age}, ${description}, ${imageUrl}, ${gifUrl}, ${sql.json(attributes)}, ${parents ? sql.json(parents) : null})
        RETURNING id, name, breed, birthdate, age, description, image_url, gif_url, attributes, parents, created_at
      `;

      return { statusCode: 201, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(row) };
    }

    if (event.httpMethod === 'DELETE') {
      const url = new URL(event.rawUrl || `https://x${event.path}${event.rawQuery ? '?' + event.rawQuery : ''}`);
      const id = url.searchParams.get('id');
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id' }) };

      await sql`DELETE FROM dogs WHERE id = ${id}`;
      return { statusCode: 204, headers };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server error' }) };
  }
}
