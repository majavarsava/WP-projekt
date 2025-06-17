document.addEventListener('DOMContentLoaded', function() {
    // Only run on profile.html
    if (window.location.pathname.endsWith("profile.html")) {
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
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
            }
        });
    }
});