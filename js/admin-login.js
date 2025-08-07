import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "[https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js](https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js)";

// Get references to the HTML elements
const loginForm = document.getElementById('admin-login-form');
const errorMessage = document.getElementById('error-message');

// Add an event listener for the form submission
loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent the page from reloading

    const email = loginForm.email.value;
    const password = loginForm.password.value;

    // Use the Firebase function to sign in
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in successfully
            const user = userCredential.user;
            console.log("Admin logged in successfully:", user.email);
            // Redirect to the admin dashboard
            window.location.href = '/admin/'; // This will go to admin/index.html
        })
        .catch((error) => {
            // Handle errors
            console.error("Admin login error:", error.message);
            errorMessage.textContent = "Invalid email or password. Please try again.";
        });
});