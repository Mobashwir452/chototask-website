// FILE: js/firebase-config.js (Corrected)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// 1. Storage import korun
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyB4sz5Kw4iGwyuRtSlLps_jxzzeLJZaftk",
    authDomain: "chototask.firebaseapp.com",
    projectId: "chototask",
    storageBucket: "chototask.appspot.com", // Shothik format e dewa hoyeche
    messagingSenderId: "732784623828",
    appId: "1:732784623828:web:aa48eb4fc732805547bb41",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
// 2. Storage initialize korun
const storage = getStorage(app);

// 3. Export-e storage jog korun
export { db, auth, storage };