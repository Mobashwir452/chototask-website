// FILE: js/firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// PASTE YOUR FIREBASE CONFIG OBJECT HERE
const firebaseConfig = {
    apiKey: "AIzaSyB4sz5Kw4iGwyuRtSlLps_jxzzeLJZaftk",
    authDomain: "chototask.firebaseapp.com",
    projectId: "chototask",
    storageBucket: "chototask.firebasestorage.app",
    messagingSenderId: "732784623828",
    appId: "1:732784623828:web:aa48eb4fc732805547bb41",
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Export the services so we can use them in other files
export { db, auth };