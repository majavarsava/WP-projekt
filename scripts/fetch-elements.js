document.addEventListener('DOMContentLoaded', async function() {
    // Only run on elements.html
    if (!window.location.pathname.endsWith("elements.html")) return;

    const db = firebase.firestore();
    const storage = firebase.storage();
    const elementsList = document.getElementById('elements-list');
    elementsList.innerHTML = "Učitavanje...";
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const filterButtons = document.querySelectorAll('.filter-button');
    let allElements = [];

    // Fetch all elements once
    async function fetchAllElements() {
        elementsList.innerHTML = "Učitavanje...";
        const snapshot = await db.collection('elements').get();
        allElements = [];
        snapshot.forEach(doc => {
            allElements.push({ id: doc.id, ...doc.data() });
        });
        renderElements();
    }

    // Render elements based on current search/filter
    async function renderElements() {
        let searchTerm = searchInput.value.trim().toLowerCase();
        let activeLevel = document.querySelector('.filter-button.active')?.dataset.level || "All";

        let filtered = allElements.filter(el => {
            let matchesLevel = (activeLevel === "All") || (el.level && el.level === activeLevel);
            let matchesSearch = !searchTerm || (el.name && el.name.toLowerCase().includes(searchTerm));
            return matchesLevel && matchesSearch;
        });

        elementsList.innerHTML = "";
        if (filtered.length === 0) {
            elementsList.innerHTML = "<p>Nema elemenata za prikaz.</p>";
            return;
        }

        for (const data of filtered) {
            let imageUrl = "images/logo-big.png";
            if (data.image && data.image.startsWith('http')) imageUrl = data.image;

            const link = document.createElement('a');
            link.href = `element-page.html?id=${data.id}`;
            link.style.textDecoration = "none";

            const el = document.createElement('div');
            el.className = "elements-item";
            el.innerHTML = `
                <div class="element-content">
                    <div class="element-image-container">
                        <img src="${imageUrl}" alt="${data.name}" class="element-image" loading="lazy">
                    </div>
                    <div class="element-title">
                        ${data.name || 'Unnamed Element'}
                    </div>
                </div>
            `;
            link.appendChild(el);
            elementsList.appendChild(link);
        }
    }

    const resetBtn = document.getElementById('reset-filters');
    resetBtn.addEventListener('click', function() {
        // Clear search
        searchInput.value = "";
        // Set "All" as active
        filterButtons.forEach(b => b.classList.remove('active'));
        document.querySelector('.filter-button[data-level="All"]').classList.add('active');
        renderElements();
    });

    // Search functionality
    searchBtn.addEventListener('click', renderElements);
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === "Enter") renderElements();
    });

    // Filter functionality
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderElements();
        });
    });

    // Initial fetch
    fetchAllElements();
});

document.addEventListener('DOMContentLoaded', async function() {
    if (!window.location.pathname.endsWith("element-page.html")) return;
    // Get element ID from URL
    const params = new URLSearchParams(window.location.search);
    const elementId = params.get('id');
    if (!elementId) return;

    const db = firebase.firestore();
    const doc = await db.collection('elements').doc(elementId).get();
    if (!doc.exists) return;

    try {
        const doc = await db.collection('elements').doc(elementId).get();
        if (!doc.exists) return;

        const data = doc.data();

        // Set image with proper Firebase handling
        const imageDiv = document.getElementById('element-image');
        let imageUrl = "images/logo-big.png"; // default fallback

        if (data.image) {
            if (data.image.startsWith('http')) {
                imageUrl = data.image;
            } else {
                try {
                    imageUrl = await storage.ref(data.image).getDownloadURL();
                } catch (e) {
                    console.warn(`Failed to load Firebase image:`, e);
                }
            }
        }
        // Set the image with proper styling to fit container
        imageDiv.innerHTML = `<img src="${imageUrl}" alt="${data.name || 'Element'}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 1rem;">`;

        // Set name
        document.getElementById('element-name').textContent = data.name || "Nepoznat element";

        // Set level
        document.getElementById('element-level').textContent = data.level || "";

        // Set description
        document.getElementById('element-description').textContent = data.description || "";
    } catch (error) {
        console.error('Error loading element:', error);
    }
});

document.addEventListener('DOMContentLoaded', async function() {
    // Only run on folder pages
    const path = window.location.pathname;
    if (!path.includes('folder-')) return;

    // Map page to folder key
    let folderKey = null;
    if (path.includes('zelje')) folderKey = 'wishlist';
    else if (path.includes('favoriti')) folderKey = 'favorites';
    else if (path.includes('usavrseni')) folderKey = 'mastered';
    if (!folderKey) return;

    const db = firebase.firestore();
    const elementsList = document.querySelector('.elements');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const filterButtons = document.querySelectorAll('.filter-button');
    const resetBtn = document.getElementById('reset-filters');

    // Wait for auth
    firebase.auth().onAuthStateChanged(async function(user) {
        if (!user) {
            elementsList.innerHTML = "<p>Morate biti prijavljeni.</p>";
            return;
        }

        // Get user's folder array
        const userDoc = await db.collection('users').doc(user.uid).get();
        const folders = userDoc.data()?.folders || {};
        const elementIds = folders[folderKey] || [];
        if (!elementIds.length) {
            elementsList.innerHTML = "<p>Nema elemenata u ovoj mapi.</p>";
            return;
        }

        // Fetch all elements by IDs
        let allElements = [];
        for (const id of elementIds) {
            const elDoc = await db.collection('elements').doc(id).get();
            if (elDoc.exists) allElements.push({ id, ...elDoc.data() });
        }

        // Filtering and rendering logic
        async function renderElements() {
            let searchTerm = searchInput.value.trim().toLowerCase();
            let activeLevel = document.querySelector('.filter-button.active')?.dataset.level || "All";

            let filtered = allElements.filter(el => {
                let matchesLevel = (activeLevel === "All") || (el.level && el.level === activeLevel);
                let matchesSearch = !searchTerm || (el.name && el.name.toLowerCase().includes(searchTerm));
                return matchesLevel && matchesSearch;
            });

            elementsList.innerHTML = "";
            if (filtered.length === 0) {
                elementsList.innerHTML = "<p>Nema elemenata za prikaz.</p>";
                return;
            }

            for (const data of filtered) {
                let imageUrl = "images/logo-big.png";
                if (data.image && data.image.startsWith('http')) imageUrl = data.image;

                const link = document.createElement('a');
                link.href = `element-page.html?id=${data.id}`;
                link.style.textDecoration = "none";

                const el = document.createElement('div');
                el.className = "elements-item";
                el.innerHTML = `
                    <div class="element-content">
                        <div class="element-image-container">
                            <img src="${imageUrl}" alt="${data.name}" class="element-image" loading="lazy">
                        </div>
                        <div class="element-title">
                            ${data.name || 'Unnamed Element'}
                        </div>
                    </div>
                `;
                link.appendChild(el);
                elementsList.appendChild(link);
            }
        }

        // Event listeners
        searchBtn.addEventListener('click', renderElements);
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === "Enter") renderElements();
        });
        filterButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderElements();
            });
        });
        resetBtn.addEventListener('click', function() {
            searchInput.value = "";
            filterButtons.forEach(b => b.classList.remove('active'));
            document.querySelector('.filter-button[data-level="All"]').classList.add('active');
            renderElements();
        });

        // Initial render
        renderElements();
    });
});

async function showBeginnerElements() {
    const db = firebase.firestore();
    const gallery = document.querySelector('.gallery');
    if (!gallery) return;

    gallery.innerHTML = "Učitavanje...";

    try {
        const snapshot = await db.collection('elements').where('level', '==', 'Beginner').limit(8).get();
        if (snapshot.empty) {
            gallery.innerHTML = "<p>Nema beginner elemenata za prikaz.</p>";
            return;
        }

        gallery.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            let imageUrl = "images/logo-big.png";
            if (data.image && data.image.startsWith('http')) imageUrl = data.image;

            const link = document.createElement('a');
            link.href = `element-page.html?id=${doc.id}`;
            link.style.textDecoration = "none";

            const el = document.createElement('div');
            el.className = "elements-item";
            el.innerHTML = `
                <div class="element-content">
                    <div class="element-image-container">
                        <img src="${imageUrl}" alt="${data.name}" class="element-image" loading="lazy">
                    </div>
                    <div class="element-title">
                        ${data.name || 'Unnamed Element'}
                    </div>
                </div>
            `;
            link.appendChild(el);
            gallery.appendChild(link);
        });
    } catch (err) {
        gallery.innerHTML = "<p>Greška pri dohvaćanju beginner elemenata.</p>";
        console.error('Error fetching beginner elements:', err);
    }
}

// Call this ONLY on the homepage (index.html)
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.endsWith("index.html")) {
        showBeginnerElements();
    }
});