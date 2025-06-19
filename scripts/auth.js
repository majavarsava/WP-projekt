const db = firebase.firestore();

const protectedPages = [
    "profile.html",
    "folder-zelje.html",
    "folder-favoriti.html",
    "folder-usavrseni.html"
];

const adminPages = [
    "add-element.html"
];

// redirect to login if not authenticated - za sve protected pages
if (protectedPages.some(page => window.location.pathname.endsWith(page))) {
    firebase.auth().onAuthStateChanged(function(user) {
        if (!user) {
            window.location.href = "login.html";
        }
    });
}
if (adminPages.some(page => window.location.pathname.endsWith(page))) {
    firebase.auth().onAuthStateChanged(async function(user) {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!user || !userDoc.data().isAdmin) {
            window.location.href = "index.html";
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    firebase.auth().onAuthStateChanged(async function(user) {
        const authIcons = document.querySelectorAll('.auth-required');
        authIcons.forEach(icon => {
            icon.style.display = user ? '' : 'none';
        });

        const guestIcons = document.querySelectorAll('.guest-only');
        guestIcons.forEach(icon => {
            icon.style.display = user ? 'none' : '';
        });

         // Show/hide for admins
        const adminElements = document.querySelectorAll('.admin-only');
        if (user) {
            const db = firebase.firestore();
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().isAdmin) {
                adminElements.forEach(el => el.style.display = '');
            } else {
                adminElements.forEach(el => el.style.display = 'none');
            }
        } else {
            adminElements.forEach(el => el.style.display = 'none');
        }
    });
});

function firebaseErrorToCroatian(error) {
    if (!error || !error.code) return "Došlo je do pogreške.";
    switch (error.code) {
        case "auth/user-not-found":
            return "Korisničko ime ne postoji.";
        case "auth/wrong-password":
            return "Pogrešna lozinka.";
        case "auth/invalid-email":
            return "Neispravno korisničko ime.";
        case "auth/email-already-in-use":
            return "Korisničko ime je već zauzeto.";
        case "auth/weak-password":
            return "Lozinka mora imati barem 6 znakova.";
        case "auth/too-many-requests":
            return "Previše pokušaja. Pokušajte kasnije.";
        case "auth/invalid-credential":
            return "Neispravno korisničko ime ili lozinka.";
        case "auth/missing-password":
            return "Lozinka je obavezna.";
        default:
            return "Greška: " + error.message;
    }
}

// LOGIN
const loginForm = document.getElementById('login-form');
if (loginForm) {
    const loginError = document.getElementById('login-error');
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        loginError.textContent = ''; // ocisti stari eror
        const username = loginForm.querySelector('input[type="text"]').value.trim();
        const password = loginForm.querySelector('input[type="password"]').value;
        const email = username.toLowerCase() + '@artitudo.app';
        firebase.auth().signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                window.location.href = "index.html";
            })
            .catch((error) => {
                loginError.textContent = firebaseErrorToCroatian(error);
            });
    });
}

// REGISTER
const registerForm = document.getElementById('register-form');
if (registerForm) {
    const registerError = document.getElementById('register-error');
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        registerError.textContent = ''; // ocisti stari eror
        console.log("Register form submitted");
        const username = registerForm.querySelector('input[type="text"]').value.trim();
        const password = registerForm.querySelectorAll('input[type="password"]')[0].value;
        const confirmPassword = registerForm.querySelectorAll('input[type="password"]')[1].value;
        if (username.length < 3) {
            registerError.textContent = 'Korisničko ime mora imati barem 3 znaka.';
            return;
        }
        if (password !== confirmPassword) {
            registerError.textContent = 'Lozinke se ne podudaraju.';
            return;
        }
        const email = username.toLowerCase() + '@artitudo.app';
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                const db = firebase.firestore();
                db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isAdmin: false,
                    username: username,
                    email: user.email,
                    folders: {
                        favorites: [],
                        mastered: [],
                        wishlist: [],
                    }
                }).then(() => {
                    alert('Registracija uspješna!');
                    window.location.href = "index.html";
                }).catch((error) => {
                    registerError.textContent = 'Greška pri spremanju korisnika: ' + error.message;
                });
            })
            .catch((error) => {
                registerError.textContent = firebaseErrorToCroatian(error);
            });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            firebase.auth().signOut().then(() => {
                window.location.href = "login.html";
            }).catch((error) => {
                alert("Greška pri odjavi: " + error.message);
            });
        });
    }
});

console.log("Firebase Auth object:", firebase.auth());