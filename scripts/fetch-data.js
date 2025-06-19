document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.endsWith("profile.html")) {
        firebase.auth().onAuthStateChanged(async function(user) {
            if (user) {
                await cleanupUserFolders(user.uid);
                const db = firebase.firestore();
                db.collection('users').doc(user.uid).get().then(doc => {
                    if (doc.exists) {
                        const data = doc.data();
                        document.getElementById('profile-username').textContent = data.username || "Korisničko ime";
                        document.getElementById('favorites-count').textContent = data.folders?.favorites?.length ?? 0;
                        document.getElementById('mastered-count').textContent = data.folders?.mastered?.length ?? 0;
                        document.getElementById('wishlist-count').textContent = data.folders?.wishlist?.length ?? 0;
                        
                        const addElementBtn = document.getElementById('add-element-btn');
                        if (addElementBtn) {
                            addElementBtn.style.display = data.isAdmin ? '' : 'none';
                        }
                    }
                }).catch(error => {
                    console.error("Greška pri dohvaćanju korisnika:", error);
                });
                showFavoriteElements(user.uid);
            }
        });
    }
});

async function cleanupUserFolders(userId) {
    const db = firebase.firestore();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return;

    const folders = userDoc.data().folders || {};
    const folderKeys = ['favorites', 'mastered', 'wishlist'];
    let changed = false;

    // Get all unique element IDs from all folders
    const allIds = new Set();
    folderKeys.forEach(key => {
        (folders[key] || []).forEach(id => allIds.add(id));
    });

    // koji ID jos postoje
    const checkPromises = Array.from(allIds).map(async id => {
        const elDoc = await db.collection('elements').doc(id).get();
        return { id, exists: elDoc.exists };
    });
    const results = await Promise.all(checkPromises);

    // ovi su validni
    const validIds = new Set(results.filter(r => r.exists).map(r => r.id));

    // makni ne-validne, tj ove koji ne postoje
    folderKeys.forEach(key => {
        const original = folders[key] || [];
        const filtered = original.filter(id => validIds.has(id));
        if (filtered.length !== original.length) {
            folders[key] = filtered;
            changed = true;
        }
    });

    // update doc ak ima promjene
    if (changed) {
        await userRef.update({ folders });
        console.log("User folders cleaned up.");
    }
}

async function showFavoriteElements(userId) {
    const db = firebase.firestore();
    const gallery = document.querySelector('.elements');
    if (!gallery) return;

    // user's favorites
    const userDoc = await db.collection('users').doc(userId).get();
    const favorites = userDoc.data()?.folders?.favorites || [];
    if (!favorites.length) {
        gallery.innerHTML = "<p>Nema omiljenih elemenata za prikaz.</p>";
        return;
    }

    // 4 fav
    const elementPromises = favorites.slice(0, 4).map(async id => {
        const elDoc = await db.collection('elements').doc(id).get();
        return elDoc.exists ? { id, ...elDoc.data() } : null;
    });
    const elements = (await Promise.all(elementPromises)).filter(Boolean);

    // render elements
    gallery.innerHTML = "";
    if (!elements.length) {
        gallery.innerHTML = "<p>Nema omiljenih elemenata za prikaz.</p>";
        return;
    }

    for (const data of elements) {
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
                    <img src="${imageUrl}" alt="${data.name}" class="element-favorite" loading="lazy">
                </div>
                <div class="element-title">
                    ${data.name || 'Unnamed Element'}
                </div>
            </div>
        `;
        link.appendChild(el);
        gallery.appendChild(link);
    }
}