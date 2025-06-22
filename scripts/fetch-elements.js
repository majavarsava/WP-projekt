document.addEventListener('DOMContentLoaded', async function() {
    if (!window.location.pathname.endsWith("elements.html")) return;

    const elementsList = document.getElementById('elements-list');
    elementsList.innerHTML = "Učitavanje...";
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const filterButtons = document.querySelectorAll('.filter-button');
    let allElements = [];

    // fetch elements at once
    async function fetchAllElements() {
        elementsList.innerHTML = "Učitavanje...";
        const response = await fetch('http://localhost:3001/api/elements');
        allElements = await response.json();
        renderElements();
    }

    // render elements based on current search/filter
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
        searchInput.value = "";
        // all opet aktivno
        filterButtons.forEach(b => b.classList.remove('active'));
        document.querySelector('.filter-button[data-level="All"]').classList.add('active');
        renderElements();
    });

    // search func
    searchBtn.addEventListener('click', renderElements);
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === "Enter") renderElements();
    });

    // filter func
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderElements();
        });
    });

    // inicijalni fetch
    fetchAllElements();
});

document.addEventListener('DOMContentLoaded', async function() {
    if (!window.location.pathname.endsWith("element-page.html")) return;
    
    // element ID from URL
    const params = new URLSearchParams(window.location.search);
    const elementId = params.get('id');
    if (!elementId) return;

    const response = await fetch('http://localhost:3001/api/elements');
    const allElements = await response.json();
    const data = allElements.find(el => el.id === elementId);
    if (!data) return;

    // Set image
    const imageDiv = document.getElementById('element-image');
    let imageUrl = "images/logo-big.png";
    if (data.image && data.image.startsWith('http')) imageUrl = data.image;
    imageDiv.innerHTML = `<img src="${imageUrl}" alt="${data.name || 'Element'}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 1rem;">`;

    document.getElementById('element-name').textContent = data.name || "Nepoznat element";
    document.getElementById('element-level').textContent = data.level || "";
    document.getElementById('element-description').textContent = data.description || "";

    // FILL ICONS IF IN USER'S FOLDERS
    const db = firebase.firestore();
    firebase.auth().onAuthStateChanged(async function(user) {
        if (!user) return; 
        const userRef = await db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();
        const folders = userDoc.data()?.folders || {};

        // uod folder i icon
        async function toggleFolder(folderKey, iconEl, filledSrc, emptySrc) {
            let arr = folders[folderKey] || [];
            const idx = arr.indexOf(elementId);
            if (idx === -1) {
                arr.push(elementId);
                iconEl.querySelector('img').src = filledSrc;
            } else {
                arr.splice(idx, 1);
                iconEl.querySelector('img').src = emptySrc;
            }
            folders[folderKey] = arr;
            await userRef.update({ folders });
        }
        // favorites
        const heartDiv = document.querySelector('.folder-icon[title="Favoriti"]');
        if (heartDiv) {
            const heartIcon = heartDiv.querySelector('img');
            heartIcon.src = (folders.favorites && folders.favorites.includes(elementId)) ? "icons/heart-filled.svg" : "icons/heart.svg";
            heartDiv.onclick = async () => {
                await toggleFolder("favorites", heartDiv, "icons/heart-filled.svg", "icons/heart.svg");
            };
        }
        
        // wishlist
        const starDiv = document.querySelector('.folder-icon[title="Želje"]');
        if (starDiv) {
            const starIcon = starDiv.querySelector('img');
            starIcon.src = (folders.wishlist && folders.wishlist.includes(elementId)) ? "icons/star-filled.svg" : "icons/star.svg";
            starDiv.onclick = async () => {
                await toggleFolder("wishlist", starDiv, "icons/star-filled.svg", "icons/star.svg");
            };
        }
        
        // smastered
        const checkDiv = document.querySelector('.folder-icon[title="Usavršeni elementi"]');
        if (checkDiv) {
            const checkIcon = checkDiv.querySelector('img');
            checkIcon.src = (folders.mastered && folders.mastered.includes(elementId)) ? "icons/checkmark-filled.svg" : "icons/checkmark.svg";
            checkDiv.onclick = async () => {
                await toggleFolder("mastered", checkDiv, "icons/checkmark-filled.svg", "icons/checkmark.svg");
            };
        }
    });

    const deleteBtn = document.getElementById('delete-button');
    if (deleteBtn) {
        firebase.auth().onAuthStateChanged(async function(user) {
            if (!user) {
                deleteBtn.style.display = 'none';
                return;
            }
            const db = firebase.firestore();
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().isAdmin) {
                deleteBtn.style.display = '';
                deleteBtn.onclick = async function() {
                    if (confirm("Jeste li sigurni da želite izbrisati ovaj element?")) {
                        try {
                            await fetch(`http://localhost:3001/api/elements/${elementId}`, {
                                method: 'DELETE'
                            });
                            alert("Element uspješno izbrisan.");
                            window.location.href = "elements.html";
                        } catch (error) {
                            alert("Došlo je do greške pri brisanju elementa." + error.message);
                        }
                    }
                };
            } else {
                deleteBtn.style.display = 'none';
            }
        });
    }

});

document.addEventListener('DOMContentLoaded', async function() {
    const path = window.location.pathname;
    if (!path.includes('folder-')) return;

    // map page to folder key
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

    // wait for auth
    firebase.auth().onAuthStateChanged(async function(user) {
        if (!user) {
            elementsList.innerHTML = "<p>Morate biti prijavljeni.</p>";
            return;
        }

        // get user's folder array
        const userDoc = await db.collection('users').doc(user.uid).get();
        const folders = userDoc.data()?.folders || {};
        const elementIds = folders[folderKey] || [];
        if (!elementIds.length) {
            elementsList.innerHTML = "<p>Nema elemenata u ovoj mapi.</p>";
            return;
        }

        // fetch all elements by IDs
        let allElements = [];
        for (const id of elementIds) {
            const elDoc = await db.collection('elements').doc(id).get();
            if (elDoc.exists) allElements.push({ id, ...elDoc.data() });
        }

        // filtering and rendering logic
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

        renderElements();
    });
});

async function showBeginnerElements() {
    const gallery = document.querySelector('.gallery');
    if (!gallery) return;

    gallery.innerHTML = "Učitavanje...";

    try {
        const response = await fetch('http://localhost:3001/api/elements');
        const allElements = await response.json();
        const beginnerElements = allElements.filter(el => el.level === 'Beginner').slice(0, 8);

        if (beginnerElements.length === 0) {
            gallery.innerHTML = "<p>Nema beginner elemenata za prikaz.</p>";
            return;
        }

        gallery.innerHTML = "";
        beginnerElements.forEach(data => {
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
            gallery.appendChild(link);
        });
    } catch (err) {
        gallery.innerHTML = "<p>Greška pri dohvaćanju beginner elemenata.</p>";
        console.error('Error fetching beginner elements:', err);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.endsWith("index.html")) {
        showBeginnerElements();
    }
});