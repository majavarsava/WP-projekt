
const firebaseConfig = {
    apiKey: "AIzaSyAs5Bf7rG2RVht_GBwv9j8fVWBry9ZgAcA",
    authDomain: "polerine-mv.firebaseapp.com",
    projectId: "polerine-mv",
    storageBucket: "polerine-mv.appspot.com",
    messagingSenderId: "702486419343",
    appId: "1:702486419343:web:d099e596f304b3f2a41dfa"
};

const app = firebase.initializeApp(firebaseConfig);

console.log("Firebase initialized:", firebase.apps.length > 0);