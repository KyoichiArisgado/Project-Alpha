/* PupMatch - OOP Adoption Site */

// Utilities
const qs = (s, el = document) => el.querySelector(s);
const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));
const byId = id => document.getElementById(id);

// URL validation helper
function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    try {
        const urlObj = new URL(url);
        
        // Check for common image hosting services
        const validHosts = [
            'images.unsplash.com',
            'drive.google.com',
            'i.imgur.com',
            'imgur.com',
            'res.cloudinary.com',
            'github.com',
            'raw.githubusercontent.com',
            'web.telegram.org',
            'telegram.org',
            't.me'
        ];
        
        // Check if it's a Google Drive direct link
        if (urlObj.hostname === 'drive.google.com') {
            return urlObj.pathname.includes('/uc') && urlObj.searchParams.has('id');
        }
        
        // Check if it's a Telegram URL
        if (urlObj.hostname.includes('telegram.org') || urlObj.hostname.includes('t.me')) {
            return urlObj.pathname.includes('/k/') || urlObj.pathname.includes('/file/');
        }
        
        // Check for other valid hosts
        return validHosts.some(host => urlObj.hostname.includes(host));
    } catch (e) {
        return false;
    }
}

// Storage keys
const STORAGE_KEYS = {
    DOGS: 'pupmatch.dogs',
    ADOPTIONS: 'pupmatch.adoptions',
    UPLOADED_IMAGES: 'pupmatch.uploaded_images'
};

// Image upload and storage
class ImageUploader {
    constructor() {
        this.uploadedImages = this.loadUploadedImages();
    }

    loadUploadedImages() {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.UPLOADED_IMAGES);
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            console.error('Failed to load uploaded images', e);
            return {};
        }
    }

    saveUploadedImages() {
        localStorage.setItem(STORAGE_KEYS.UPLOADED_IMAGES, JSON.stringify(this.uploadedImages));
    }

    async uploadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageId = crypto.randomUUID();
                const imageData = {
                    id: imageId,
                    data: e.target.result,
                    filename: file.name,
                    size: file.size,
                    type: file.type,
                    uploadedAt: new Date().toISOString()
                };
                
                this.uploadedImages[imageId] = imageData;
                this.saveUploadedImages();
                resolve(imageId);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    getImageUrl(imageId) {
        const imageData = this.uploadedImages[imageId];
        return imageData ? imageData.data : null;
    }

    removeImage(imageId) {
        delete this.uploadedImages[imageId];
        this.saveUploadedImages();
    }

    getAllImages() {
        return Object.values(this.uploadedImages);
    }
}

// OOP Models
class Dog {
    constructor({ id, name, breed, age, birthdate, description, imageUrl, gifUrl, imageId, gifId, attributes, parents }) {
        this.id = id || crypto.randomUUID();
        this.name = name;
        this.breed = breed;
        // Prefer birthdate; keep age only for legacy compatibility
        this.birthdate = birthdate || null;
        this.age = age || null;
        this.description = description;
        this.imageUrl = imageUrl || '';
        this.gifUrl = gifUrl || '';
        this.imageId = imageId || null; // For uploaded images
        this.gifId = gifId || null; // For uploaded GIFs
        this.attributes = attributes || {
            friendliness: 5,
            energy: 4,
            trainability: 4,
            kidFriendly: 5,
            size: 3
        };
        this.parents = parents || { mother: null, father: null };
    }

    getImageUrl(imageUploader) {
        if (this.imageId && imageUploader) {
            return imageUploader.getImageUrl(this.imageId) || this.imageUrl;
        }
        return this.imageUrl;
    }

    getGifUrl(imageUploader) {
        if (this.gifId && imageUploader) {
            return imageUploader.getImageUrl(this.gifId) || this.gifUrl;
        }
        return this.gifUrl;
    }
}

class Shelter {
    constructor() {
        this.dogs = [];
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.DOGS);
            const rawDogs = raw ? JSON.parse(raw) : [];
            console.log('Loaded dogs from localStorage:', rawDogs.length);
            
            // Convert plain objects back to Dog instances
            this.dogs = rawDogs.map(dogData => new Dog(dogData));
            console.log('Converted to Dog instances:', this.dogs.length);
        } catch (e) {
            this.dogs = [];
            console.log('Error loading dogs, starting fresh');
        }
        // Do not auto-seed sample dogs; start with empty list if none are stored
        console.log('Final dogs count:', this.dogs.length);
        return this.dogs;
    }

    save() {
        localStorage.setItem(STORAGE_KEYS.DOGS, JSON.stringify(this.dogs));
    }

    // Removed sample seeding to avoid initial demo data
    seed() {
        this.dogs = [];
        this.save();
    }

    addDog(dog) {
        this.dogs.unshift({ ...dog });
        this.save();
    }

    removeDogById(dogId) {
        this.dogs = this.dogs.filter(d => d.id !== dogId);
        this.save();
    }

    getDogs() {
        return [...this.dogs];
    }
}

class AdoptionManager {
    constructor() {
        this.adoptions = [];
        this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.ADOPTIONS);
            this.adoptions = raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Failed to load adoptions', e);
            this.adoptions = [];
        }
    }

    save() {
        localStorage.setItem(STORAGE_KEYS.ADOPTIONS, JSON.stringify(this.adoptions));
    }

    submit({ dogId, dogName, fullName, pickupTime, remarks }) {
        const record = {
            id: crypto.randomUUID(),
            dogId,
            dogName,
            fullName,
            pickupTime,
            remarks,
            createdAt: new Date().toISOString()
        };
        this.adoptions.push(record);
        this.save();
        return record;
    }
}

// App State
const shelter = new Shelter();
const adoptionManager = new AdoptionManager();
const imageUploader = new ImageUploader();
let ownerMode = false;
let selectedDog = null;

// Render Helpers
function renderBones(count) {
    const max = 5;
    const frag = document.createDocumentFragment();
    for (let i = 1; i <= max; i++) {
        const span = document.createElement('span');
        span.className = 'bone' + (i <= count ? '' : ' off');
        span.title = i <= count ? 'Bone' : 'Empty';
        frag.appendChild(span);
    }
    const wrap = document.createElement('span');
    wrap.className = 'bones';
    wrap.appendChild(frag);
    return wrap;
}

function attributeRow(name, value) {
    const row = document.createElement('div');
    row.className = 'attr';
    const label = document.createElement('div');
    label.className = 'attr-name';
    label.textContent = name;
    row.appendChild(label);
    row.appendChild(renderBones(value));
    return row;
}

function formatAge(birthdate, fallbackAgeText) {
    if (birthdate) {
        const bd = new Date(birthdate);
        if (!isNaN(bd)) {
            const now = new Date();
            let years = now.getFullYear() - bd.getFullYear();
            let months = now.getMonth() - bd.getMonth();
            let days = now.getDate() - bd.getDate();
            if (days < 0) { months -= 1; }
            if (months < 0) { years -= 1; months += 12; }
            if (years > 0) return years === 1 ? '1 year' : `${years} years`;
            if (months > 0) return months === 1 ? '1 month' : `${months} months`;
            return 'Less than a month';
        }
    }
    return fallbackAgeText || '';
}

function createCard(dog) {
    const card = document.createElement('article');
    card.className = 'card';
    card.tabIndex = 0;

    const mediaWrap = document.createElement('div');
    mediaWrap.className = 'card-media-wrap';
    const img = document.createElement('img');
    img.src = dog.getImageUrl(imageUploader);
    img.alt = `${dog.name} the ${dog.breed}`;
    img.className = 'card-media';

    // Inline SVG placeholder (lightweight, works offline)
    const PLACEHOLDER_DATA_URI = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="100%" height="100%" fill="%23f2f3f5"/><g fill="%239aa1a9" font-family="Arial,Helvetica,sans-serif" text-anchor="middle"><text x="400" y="310" font-size="22">Image not available</text></g></svg>';

    // Add error handling for failed image loads (use one-time fallback to avoid loops)
    img.addEventListener('error', function onError() {
        if (img.dataset.fallbackApplied === '1') return; // prevent infinite loop
        console.warn(`Failed to load image for ${dog.name}:`, dog.getImageUrl(imageUploader));
        img.dataset.fallbackApplied = '1';
        img.classList.add('image-error');
        img.src = PLACEHOLDER_DATA_URI;
        img.alt = `Placeholder for ${dog.name}`;
    }, { once: false });

    // Add load success handler (remove error class if previously set)
    img.addEventListener('load', function () {
        img.classList.remove('image-error');
    });

    mediaWrap.appendChild(img);
    card.appendChild(mediaWrap);

    const body = document.createElement('div');
    body.className = 'card-body';
    const title = document.createElement('h4');
    title.className = 'card-title';
    title.textContent = dog.name;
    const sub = document.createElement('p');
    sub.className = 'card-sub';
    sub.textContent = `${dog.breed} • ${formatAge(dog.birthdate, dog.age || '')}`;
    body.appendChild(title);
    body.appendChild(sub);
    card.appendChild(body);

    // Attribute strip below media
    const strip = document.createElement('div');
    strip.className = 'attr-strip';
    const attrs = document.createElement('div');
    attrs.className = 'attrs';
    attrs.appendChild(attributeRow('Friendliness', dog.attributes.friendliness));
    attrs.appendChild(attributeRow('Energy', dog.attributes.energy));
    attrs.appendChild(attributeRow('Trainability', dog.attributes.trainability));
    attrs.appendChild(attributeRow('Kid Friendly', dog.attributes.kidFriendly));
    attrs.appendChild(attributeRow('Size', dog.attributes.size));
    strip.appendChild(attrs);
    card.appendChild(strip);

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const adoptBtn = document.createElement('button');
    adoptBtn.className = 'btn btn-primary';
    adoptBtn.textContent = 'Adopt Me';
    adoptBtn.addEventListener('click', (e) => { e.stopPropagation(); openAdoptModal(dog); });
    actions.appendChild(adoptBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-outline';
    delBtn.textContent = 'Delete';
    delBtn.hidden = !ownerMode;
    delBtn.addEventListener('click', () => {
        if (confirm(`Delete ${dog.name}?`)) {
            shelter.removeDogById(dog.id);
            renderGrid();
        }
    });
    actions.appendChild(delBtn);
    card.appendChild(actions);

    // Hover-to-GIF
    const gifUrl = dog.getGifUrl(imageUploader);
    if (gifUrl) {
        card.addEventListener('mouseenter', () => { img.src = gifUrl; });
        card.addEventListener('mouseleave', () => { img.src = dog.getImageUrl(imageUploader); });
        // For touch devices, toggle on tap
        card.addEventListener('touchstart', () => { img.src = gifUrl; }, { passive: true });
        card.addEventListener('touchend', () => { img.src = dog.getImageUrl(imageUploader); }, { passive: true });
    }

    // Open details modal on card click
    card.addEventListener('click', () => openDogDetail(dog));

    return card;
}

function renderGrid() {
    console.log('renderGrid called');
    const grid = byId('dogGrid');
    const dogs = shelter.getDogs();
    console.log('Grid element:', grid);
    console.log('Dogs to render:', dogs.length);
    
    if (!grid) {
        console.log('Grid element not found!');
        return;
    }
    
    grid.innerHTML = '';
    dogs.forEach(dog => {
        console.log('Creating card for:', dog.name);
        const card = createCard(dog);
        grid.appendChild(card);
    });
    console.log('Grid rendered with', grid.children.length, 'cards');
}

// Modal logic
const adoptDialog = byId('adoptDialog');
const adoptForm = byId('adoptForm');
const adoptTitle = byId('adoptTitle');
const dogDetailDialog = byId('dogDetailDialog');
const closeDogDetailBtn = byId('closeDogDetailBtn');
const cancelDogDetailBtn = byId('cancelDogDetailBtn');
const dogDetailTitle = byId('dogDetailTitle');
const detailImg = byId('detailImg');
const detailSub = byId('detailSub');
const detailDesc = byId('detailDesc');
const detailAttrs = byId('detailAttrs');
const detailAdoptBtn = byId('detailAdoptBtn');

function openAdoptModal(dog) {
    selectedDog = dog;
    adoptTitle.textContent = `Adopt ${dog.name}`;
    adoptForm.reset();
    adoptDialog.showModal();
}

function closeAdoptModal() {
    adoptDialog.close();
}

byId('closeDialogBtn').addEventListener('click', closeAdoptModal);
byId('cancelDialogBtn').addEventListener('click', closeAdoptModal);

adoptForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!selectedDog) return;
    const form = new FormData(adoptForm);
    const fullName = (form.get('fullName') || '').toString().trim();
    const pickupTime = (form.get('pickupTime') || '').toString();
    const remarks = (form.get('remarks') || '').toString().trim();
    if (!fullName || !pickupTime) return;

    adoptionManager.submit({
        dogId: selectedDog.id,
        dogName: selectedDog.name,
        fullName,
        pickupTime,
        remarks
    });
    closeAdoptModal();
    alert(`Thank you for adopting ${selectedDog.name}.`);
});

// Dog detail modal logic
function openDogDetail(dog) {
    selectedDog = dog;
    dogDetailTitle.textContent = dog.name;
    detailImg.src = dog.getImageUrl(imageUploader);
    detailImg.alt = `${dog.name} the ${dog.breed}`;

    const PLACEHOLDER_DATA_URI = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="100%" height="100%" fill="%23f2f3f5"/><g fill="%239aa1a9" font-family="Arial,Helvetica,sans-serif" text-anchor="middle"><text x="400" y="310" font-size="22">Image not available</text></g></svg>';

    // Robust error handling for detail modal image
    detailImg.addEventListener('error', function () {
        if (detailImg.dataset.fallbackApplied === '1') return;
        console.warn(`Failed to load detail image for ${dog.name}:`, dog.getImageUrl(imageUploader));
        detailImg.dataset.fallbackApplied = '1';
        detailImg.classList.add('image-error');
        detailImg.src = PLACEHOLDER_DATA_URI;
        detailImg.alt = `Placeholder for ${dog.name}`;
    }, { once: false });

    detailSub.textContent = `${dog.breed} • ${formatAge(dog.birthdate, dog.age || '')}`;
    detailDesc.textContent = dog.description;
    detailAttrs.innerHTML = '';
    detailAttrs.appendChild(attributeRow('Friendliness', dog.attributes.friendliness));
    detailAttrs.appendChild(attributeRow('Energy', dog.attributes.energy));
    detailAttrs.appendChild(attributeRow('Trainability', dog.attributes.trainability));
    detailAttrs.appendChild(attributeRow('Kid Friendly', dog.attributes.kidFriendly));
    detailAttrs.appendChild(attributeRow('Size', dog.attributes.size));

    // Render parents if available
    if (dog.parents && (dog.parents.mother || dog.parents.father)) {
        const parentSection = document.createElement('div');
        parentSection.className = 'parents-section';

        const title = document.createElement('h5');
        title.textContent = 'Parents';
        parentSection.appendChild(title);

        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = '1fr 1fr';
        grid.style.gap = '0.8rem';

        const PLACEHOLDER_DATA_URI = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 800 600"><rect width="100%" height="100%" fill="%23f2f3f5"/></svg>';

        function parentCard(label, parent) {
            const card = document.createElement('div');
            card.style.border = '1px solid var(--ring)';
            card.style.borderRadius = '10px';
            card.style.padding = '.6rem';
            card.style.background = '#fff';
            const heading = document.createElement('div');
            heading.style.fontWeight = '800';
            heading.style.marginBottom = '.3rem';
            heading.textContent = label;
            card.appendChild(heading);
            const row = document.createElement('div');
            row.style.display = 'grid';
            row.style.gridTemplateColumns = '80px 1fr';
            row.style.gap = '.6rem';
            const img = document.createElement('img');
            img.alt = `${label} image`;
            img.style.width = '80px';
            img.style.height = '80px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '8px';
            img.src = parent?.imageUrl || PLACEHOLDER_DATA_URI;
            img.addEventListener('error', () => { img.src = PLACEHOLDER_DATA_URI; });
            const info = document.createElement('div');
            const n = document.createElement('div');
            n.textContent = parent?.name || '—';
            n.style.fontWeight = '700';
            const b = document.createElement('div');
            b.textContent = parent?.breed || '';
            b.className = 'muted';
            info.appendChild(n);
            info.appendChild(b);
            row.appendChild(img);
            row.appendChild(info);
            card.appendChild(row);
            return card;
        }

        const getParentImage = (p) => p?.imageId ? imageUploader.getImageUrl(p.imageId) || p?.imageUrl : p?.imageUrl;
        if (dog.parents.mother) grid.appendChild(parentCard('Mother', { ...dog.parents.mother, imageUrl: getParentImage(dog.parents.mother) }));
        if (dog.parents.father) grid.appendChild(parentCard('Father', { ...dog.parents.father, imageUrl: getParentImage(dog.parents.father) }));
        parentSection.appendChild(grid);
        detailAttrs.appendChild(parentSection);
    }

    // clicking outside closes by default for <dialog> when using cancel? We'll wire buttons.
    dogDetailDialog.showModal();
}

function closeDogDetail() { dogDetailDialog.close(); }
closeDogDetailBtn.addEventListener('click', closeDogDetail);
cancelDogDetailBtn.addEventListener('click', closeDogDetail);
dogDetailDialog.addEventListener('click', (e) => {
    const rect = dogDetailDialog.getBoundingClientRect();
    const within = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!within) closeDogDetail();
});
detailAdoptBtn.addEventListener('click', () => { closeDogDetail(); if (selectedDog) openAdoptModal(selectedDog); });

// Owner Mode
const ownerModeBtn = byId('ownerModeBtn');
const ownerToolbar = byId('ownerToolbar');
const addDogForm = byId('addDogForm');
const exportDataBtn = byId('exportDataBtn');
const clearAllBtn = byId('clearAllBtn');

// File upload elements
const imageFileInput = byId('imageFileInput');
const imageUrlInput = byId('imageUrlInput');
const imagePreview = byId('imagePreview');
const previewImg = byId('previewImg');
const removeImageBtn = byId('removeImageBtn');

const gifFileInput = byId('gifFileInput');
const gifUrlInput = byId('gifUrlInput');
const gifPreview = byId('gifPreview');
const previewGif = byId('previewGif');
const removeGifBtn = byId('removeGifBtn');

// Parent image elements
const motherImageFileInput = byId('motherImageFileInput');
const motherImageUrlInput = byId('motherImageUrlInput');
const motherImagePreview = byId('motherImagePreview');
const motherPreviewImg = byId('motherPreviewImg');
const removeMotherImageBtn = byId('removeMotherImageBtn');

const fatherImageFileInput = byId('fatherImageFileInput');
const fatherImageUrlInput = byId('fatherImageUrlInput');
const fatherImagePreview = byId('fatherImagePreview');
const fatherPreviewImg = byId('fatherPreviewImg');
const removeFatherImageBtn = byId('removeFatherImageBtn');

// File upload handlers
let currentImageId = null;
let currentGifId = null;
let currentMotherImageId = null;
let currentFatherImageId = null;

// Image editor state
let imageEditorState = {
    originalImage: null,
    editingImageId: null,
    editingType: 'image', // 'image' or 'gif'
    currentPreset: 'fit' // 'center', 'fit', 'fill', 'original'
};

// Image file upload
imageFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        try {
            currentImageId = await imageUploader.uploadImage(file);
            previewImg.src = imageUploader.getImageUrl(currentImageId);
            imagePreview.style.display = 'flex';
            imageUrlInput.value = ''; // Clear URL input
        } catch (error) {
            console.error('Failed to upload image:', error);
            alert('Failed to upload image. Please try again.');
        }
    }
});

// GIF file upload
gifFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        try {
            currentGifId = await imageUploader.uploadImage(file);
            previewGif.src = imageUploader.getImageUrl(currentGifId);
            gifPreview.style.display = 'flex';
            gifUrlInput.value = ''; // Clear URL input
        } catch (error) {
            console.error('Failed to upload GIF:', error);
            alert('Failed to upload GIF. Please try again.');
        }
    }
});

// Remove image
removeImageBtn.addEventListener('click', () => {
    if (currentImageId) {
        imageUploader.removeImage(currentImageId);
        currentImageId = null;
    }
    imagePreview.style.display = 'none';
    imageFileInput.value = '';
});

// Mother image upload
motherImageFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        try {
            currentMotherImageId = await imageUploader.uploadImage(file);
            motherPreviewImg.src = imageUploader.getImageUrl(currentMotherImageId);
            motherImagePreview.style.display = 'flex';
            motherImageUrlInput.value = '';
        } catch (error) {
            console.error('Failed to upload mother image:', error);
            alert('Failed to upload mother image. Please try again.');
        }
    }
});

// Father image upload
fatherImageFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        try {
            currentFatherImageId = await imageUploader.uploadImage(file);
            fatherPreviewImg.src = imageUploader.getImageUrl(currentFatherImageId);
            fatherImagePreview.style.display = 'flex';
            fatherImageUrlInput.value = '';
        } catch (error) {
            console.error('Failed to upload father image:', error);
            alert('Failed to upload father image. Please try again.');
        }
    }
});

// Remove mother image
removeMotherImageBtn.addEventListener('click', () => {
    if (currentMotherImageId) {
        imageUploader.removeImage(currentMotherImageId);
        currentMotherImageId = null;
    }
    motherImagePreview.style.display = 'none';
    motherImageFileInput.value = '';
});

// Remove father image
removeFatherImageBtn.addEventListener('click', () => {
    if (currentFatherImageId) {
        imageUploader.removeImage(currentFatherImageId);
        currentFatherImageId = null;
    }
    fatherImagePreview.style.display = 'none';
    fatherImageFileInput.value = '';
});

// Remove GIF
removeGifBtn.addEventListener('click', () => {
    if (currentGifId) {
        imageUploader.removeImage(currentGifId);
        currentGifId = null;
    }
    gifPreview.style.display = 'none';
    gifFileInput.value = '';
});

// URL input handlers
imageUrlInput.addEventListener('input', () => {
    if (imageUrlInput.value) {
        imagePreview.style.display = 'none';
        currentImageId = null;
        imageFileInput.value = '';
    }
});

motherImageUrlInput.addEventListener('input', () => {
    if (motherImageUrlInput.value) {
        motherImagePreview.style.display = 'none';
        currentMotherImageId = null;
        motherImageFileInput.value = '';
    }
});

fatherImageUrlInput.addEventListener('input', () => {
    if (fatherImageUrlInput.value) {
        fatherImagePreview.style.display = 'none';
        currentFatherImageId = null;
        fatherImageFileInput.value = '';
    }
});

gifUrlInput.addEventListener('input', () => {
    if (gifUrlInput.value) {
        gifPreview.style.display = 'none';
        currentGifId = null;
        gifFileInput.value = '';
    }
});

// Image Editor Modal Elements
const imagePreviewModal = byId('imagePreviewModal');
const editableImage = byId('editableImage');
const imageContainer = byId('imageContainer');
const thumbnailPreview = byId('thumbnailPreview');
const imagePreviewTitle = byId('imagePreviewTitle');

// Image Editor Controls
const centerBtn = byId('centerBtn');
const fitBtn = byId('fitBtn');
const fillBtn = byId('fillBtn');
const originalBtn = byId('originalBtn');
const zoomInBtn = byId('zoomInBtn');
const zoomOutBtn = byId('zoomOutBtn');
const resetBtn = byId('resetBtn');
const saveImageEditBtn = byId('saveImageEditBtn');
const cancelImageEditBtn = byId('cancelImageEditBtn');
const closeImagePreviewBtn = byId('closeImagePreviewBtn');

// Edit buttons
const editImageBtn = byId('editImageBtn');
const editGifBtn = byId('editGifBtn');

// Image Editor Functions
function openImageEditor(imageId, type = 'image') {
    const imageUrl = imageUploader.getImageUrl(imageId);
    if (!imageUrl) return;
    
    imageEditorState.editingImageId = imageId;
    imageEditorState.editingType = type;
    imageEditorState.originalImage = imageUrl;
    imageEditorState.currentPreset = 'fit';
    
    // Set up the editor
    editableImage.src = imageUrl;
    imagePreviewTitle.textContent = `Edit ${type === 'image' ? 'Image' : 'GIF'}`;
    
    // Apply default preset
    applyPreset('fit');
    updateThumbnailPreview();
    
    // Show modal
    imagePreviewModal.showModal();
}

function applyPreset(preset) {
    imageEditorState.currentPreset = preset;
    
    switch (preset) {
        case 'center':
            editableImage.style.objectFit = 'contain';
            editableImage.style.objectPosition = 'center';
            editableImage.style.width = '100%';
            editableImage.style.height = '100%';
            break;
        case 'fit':
            editableImage.style.objectFit = 'contain';
            editableImage.style.objectPosition = 'center';
            editableImage.style.width = '100%';
            editableImage.style.height = '100%';
            break;
        case 'fill':
            editableImage.style.objectFit = 'cover';
            editableImage.style.objectPosition = 'center';
            editableImage.style.width = '100%';
            editableImage.style.height = '100%';
            break;
        case 'original':
            editableImage.style.objectFit = 'none';
            editableImage.style.objectPosition = 'center';
            editableImage.style.width = 'auto';
            editableImage.style.height = 'auto';
            editableImage.style.maxWidth = '100%';
            editableImage.style.maxHeight = '100%';
            break;
    }
    
    updateThumbnailPreview();
}

function updateThumbnailPreview() {
    // Create a canvas to generate thumbnail preview
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
        canvas.width = 120;
        canvas.height = 120;
        
        const { currentPreset } = imageEditorState;
        
        switch (currentPreset) {
            case 'center':
            case 'fit':
                // Scale to fit
                const scale = Math.min(120 / img.width, 120 / img.height);
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;
                const x = (120 - scaledWidth) / 2;
                const y = (120 - scaledHeight) / 2;
                ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
                break;
            case 'fill':
                // Scale to fill
                const fillScale = Math.max(120 / img.width, 120 / img.height);
                const fillWidth = img.width * fillScale;
                const fillHeight = img.height * fillScale;
                const fillX = (120 - fillWidth) / 2;
                const fillY = (120 - fillHeight) / 2;
                ctx.drawImage(img, fillX, fillY, fillWidth, fillHeight);
                break;
            case 'original':
                // Original size (scaled to fit if too large)
                const originalScale = Math.min(120 / img.width, 120 / img.height, 1);
                const originalWidth = img.width * originalScale;
                const originalHeight = img.height * originalScale;
                const originalX = (120 - originalWidth) / 2;
                const originalY = (120 - originalHeight) / 2;
                ctx.drawImage(img, originalX, originalY, originalWidth, originalHeight);
                break;
        }
        
        thumbnailPreview.src = canvas.toDataURL();
    };
    
    img.src = imageEditorState.originalImage;
}

function saveEditedImage() {
    if (!imageEditorState.editingImageId) return;
    
    // Create a canvas to generate the final image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
        // Set canvas size (you can adjust this for different output sizes)
        canvas.width = 400;
        canvas.height = 400;
        
        const { currentPreset } = imageEditorState;
        
        switch (currentPreset) {
            case 'center':
            case 'fit':
                // Scale to fit
                const scale = Math.min(400 / img.width, 400 / img.height);
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;
                const x = (400 - scaledWidth) / 2;
                const y = (400 - scaledHeight) / 2;
                ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
                break;
            case 'fill':
                // Scale to fill
                const fillScale = Math.max(400 / img.width, 400 / img.height);
                const fillWidth = img.width * fillScale;
                const fillHeight = img.height * fillScale;
                const fillX = (400 - fillWidth) / 2;
                const fillY = (400 - fillHeight) / 2;
                ctx.drawImage(img, fillX, fillY, fillWidth, fillHeight);
                break;
            case 'original':
                // Original size (scaled to fit if too large)
                const originalScale = Math.min(400 / img.width, 400 / img.height, 1);
                const originalWidth = img.width * originalScale;
                const originalHeight = img.height * originalScale;
                const originalX = (400 - originalWidth) / 2;
                const originalY = (400 - originalHeight) / 2;
                ctx.drawImage(img, originalX, originalY, originalWidth, originalHeight);
                break;
        }
        
        // Update the stored image
        const newImageData = {
            id: imageEditorState.editingImageId,
            data: canvas.toDataURL(),
            filename: `edited_${Date.now()}.png`,
            size: canvas.toDataURL().length,
            type: 'image/png',
            uploadedAt: new Date().toISOString()
        };
        
        imageUploader.uploadedImages[imageEditorState.editingImageId] = newImageData;
        imageUploader.saveUploadedImages();
        
        // Update preview
        if (imageEditorState.editingType === 'image') {
            previewImg.src = canvas.toDataURL();
        } else {
            previewGif.src = canvas.toDataURL();
        }
        
        // Close modal
        imagePreviewModal.close();
    };
    
    img.src = imageEditorState.originalImage;
}

// Image Editor Event Listeners
centerBtn.addEventListener('click', () => applyPreset('center'));
fitBtn.addEventListener('click', () => applyPreset('fit'));
fillBtn.addEventListener('click', () => applyPreset('fill'));
originalBtn.addEventListener('click', () => applyPreset('original'));

zoomInBtn.addEventListener('click', () => {
    // Simple zoom in by switching to fill mode
    applyPreset('fill');
});

zoomOutBtn.addEventListener('click', () => {
    // Simple zoom out by switching to fit mode
    applyPreset('fit');
});

resetBtn.addEventListener('click', () => {
    // Reset to default fit mode
    applyPreset('fit');
});

saveImageEditBtn.addEventListener('click', saveEditedImage);

cancelImageEditBtn.addEventListener('click', () => {
    imagePreviewModal.close();
});

closeImagePreviewBtn.addEventListener('click', () => {
    imagePreviewModal.close();
});

// Edit button event listeners
editImageBtn.addEventListener('click', () => {
    if (currentImageId) {
        openImageEditor(currentImageId, 'image');
    }
});

editGifBtn.addEventListener('click', () => {
    if (currentGifId) {
        openImageEditor(currentGifId, 'gif');
    }
});

function setOwnerMode(enabled) {
    ownerMode = !!enabled;
    ownerToolbar.hidden = !ownerMode;
    ownerModeBtn.setAttribute('aria-expanded', String(ownerMode));
    ownerModeBtn.textContent = ownerMode ? 'Exit Owner Mode' : 'Owner Mode';
    // Re-render to toggle delete buttons
    renderGrid();
}

ownerModeBtn.addEventListener('click', () => {
    if (!ownerMode) {
        const pin = prompt('Enter owner PIN:');
        if (pin !== 'owner123') {
            alert('Invalid PIN');
            return;
        }
        setOwnerMode(true);
    } else {
        setOwnerMode(false);
    }
});

addDogForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = new FormData(addDogForm);
    const imageUrl = form.get('imageUrl') || '';
    const gifUrl = form.get('gifUrl') || '';
    
    // Check if we have either uploaded image or URL
    if (!currentImageId && !imageUrl) {
        alert('Please upload an image or provide an image URL.');
        return;
    }
    
    // Validate image URL if provided
    if (imageUrl && !isValidImageUrl(imageUrl)) {
        alert(`Invalid image URL format. Please use a direct image URL.\n\nFor Google Drive:\n1. Share the file as "Anyone with the link"\n2. Use format: https://drive.google.com/uc?export=view&id=FILE_ID\n\nCurrent URL: ${imageUrl}`);
        return;
    }
    
    // Validate GIF URL if provided
    if (gifUrl && !isValidImageUrl(gifUrl)) {
        alert(`Invalid GIF URL format. Please use a direct image URL.\n\nCurrent URL: ${gifUrl}`);
        return;
    }
    
    const dog = new Dog({
        name: form.get('name'),
        breed: form.get('breed'),
        birthdate: (form.get('birthdate') || '').toString(),
        description: form.get('description'),
        imageUrl: imageUrl,
        gifUrl: gifUrl,
        imageId: currentImageId,
        gifId: currentGifId,
        attributes: {
            friendliness: Number(form.get('friendliness')),
            energy: Number(form.get('energy')),
            trainability: Number(form.get('trainability')),
            kidFriendly: Number(form.get('kidFriendly')),
            size: Number(form.get('size'))
        },
        parents: {
            mother: {
                name: (form.get('motherName') || '').toString().trim() || null,
                breed: (form.get('motherBreed') || '').toString().trim() || null,
                imageUrl: (form.get('motherImageUrl') || '').toString().trim() || null,
                imageId: currentMotherImageId
            },
            father: {
                name: (form.get('fatherName') || '').toString().trim() || null,
                breed: (form.get('fatherBreed') || '').toString().trim() || null,
                imageUrl: (form.get('fatherImageUrl') || '').toString().trim() || null,
                imageId: currentFatherImageId
            }
        }
    });
    
    shelter.addDog(dog);
    addDogForm.reset();
    
    // Reset upload state
    currentImageId = null;
    currentGifId = null;
    currentMotherImageId = null;
    currentFatherImageId = null;
    imagePreview.style.display = 'none';
    gifPreview.style.display = 'none';
    motherImagePreview.style.display = 'none';
    fatherImagePreview.style.display = 'none';
    
    renderGrid();
});

exportDataBtn.addEventListener('click', () => {
    const payload = {
        dogs: shelter.getDogs(),
        adoptions: adoptionManager.adoptions
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pupmatch-data-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

clearAllBtn.addEventListener('click', () => {
    if (!confirm('Clear ALL dogs? This cannot be undone.')) return;
    localStorage.removeItem(STORAGE_KEYS.DOGS);
    shelter.load();
    renderGrid();
});

// Init
function init() {
    shelter.load();
    // Migrate legacy dogs that only have age string: set an approximate birthdate if missing
    const dogs = shelter.getDogs();
    let mutated = false;
    dogs.forEach(d => {
        if (!d.birthdate && d.age) {
            // Heuristic: if age contains 'year' or 'month', convert approximately
            const ageText = (d.age || '').toLowerCase();
            const now = new Date();
            let approx = new Date(now);
            const yMatch = ageText.match(/(\d+)\s*year/);
            const mMatch = ageText.match(/(\d+)\s*month/);
            if (yMatch) approx.setFullYear(now.getFullYear() - parseInt(yMatch[1], 10));
            if (mMatch) approx.setMonth(now.getMonth() - parseInt(mMatch[1], 10));
            d.birthdate = approx.toISOString().slice(0,10);
            mutated = true;
        }
    });
    if (mutated) {
        shelter.dogs = dogs;
        shelter.save();
    }
    renderGrid();
    byId('year').textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', init);

// Simple test function
function testApp() {
    console.log('Testing app...');
    const grid = document.getElementById('dogGrid');
    console.log('Grid element:', grid);
    console.log('Grid visible:', grid ? window.getComputedStyle(grid).display : 'N/A');
    console.log('Dogs in shelter:', shelter.getDogs().length);
    console.log('localStorage data:', localStorage.getItem(STORAGE_KEYS.DOGS));
    
    // Force render
    renderGrid();
    console.log('Grid children:', grid ? grid.children.length : 'No grid');
    
    // Add a test div to see if container works
    if (grid) {
        const testDiv = document.createElement('div');
        testDiv.style.cssText = 'background: red; color: white; padding: 10px; margin: 10px;';
        testDiv.textContent = 'TEST DIV - If you see this, the container works!';
        grid.appendChild(testDiv);
        console.log('Added test div to grid');
    }
}

// Make test function available globally
window.testApp = testApp;

// Manual test function to add a dog
function addTestDog() {
    const testDog = new Dog({
        name: 'Test Dog',
        breed: 'Test Breed',
        age: '1 year',
        description: 'This is a test dog to see if the system works.',
        imageUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&h=400&fit=crop',
        gifUrl: '',
        attributes: { friendliness: 5, energy: 4, trainability: 4, kidFriendly: 5, size: 3 }
    });
    
    shelter.addDog(testDog);
    renderGrid();
    console.log('Added test dog. Total dogs:', shelter.getDogs().length);
}

window.addTestDog = addTestDog;

// Force create sample dogs
function createSampleDogs() {
    console.log('Sample dog creation disabled. Clearing dogs instead...');
    localStorage.removeItem(STORAGE_KEYS.DOGS);
    shelter.load();
    renderGrid();
    console.log('All dogs cleared.');
}

window.createSampleDogs = createSampleDogs;
