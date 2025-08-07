// FILE: js/admin-login.js (Corrected)

import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const loginForm = document.getElementById('admin-login-form');
const errorMessage = document.getElementById('error-message');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = loginForm.email.value;
    const password = loginForm.password.value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("Admin logged in successfully:", userCredential.user.email);
            window.location.href = '/admin/';
        })
        .catch((error) => {
            console.error("Admin login error:", error.message);
            errorMessage.textContent = "Invalid email or password. Please try again.";
        });
});