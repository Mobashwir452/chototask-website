// FILE: js/admin-login.js (Solution)

const loginForm = document.getElementById('admin-login-form');
const errorMessage = document.getElementById('error-message');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = loginForm.email.value;
    const password = loginForm.password.value;

    // Use the global auth object to sign in
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log("Admin logged in successfully:", userCredential.user.email);
            window.location.href = '/admin/';
        })
        .catch((error) => {
            console.error("Admin login error:", error.message);
            errorMessage.textContent = "Invalid email or password. Please try again.";
        });
});