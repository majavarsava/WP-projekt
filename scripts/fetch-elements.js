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