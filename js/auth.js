// FILE: /js/auth.js (COMPLETELY REVISED)

import { auth, db } from '/js/firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, 
    setDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


// --- New Modal Elements and Functions ---
const modal = document.getElementById('feedback-modal');
const modalIconContainer = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalCloseBtn = document.getElementById('modal-close-btn');

function showModal(title, message, type = 'error') {
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    // Clear previous classes and icons
    modalIconContainer.className = 'modal-icon';
    modalIconContainer.innerHTML = '';
    
    if (type === 'success') {
        modalIconContainer.classList.add('success');
        modalIconContainer.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else { // 'error'
        modalIconContainer.classList.add('error');
        modalIconContainer.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    }

    modal.classList.add('is-visible');
}

function hideModal() {
    modal.classList.remove('is-visible');
}

// Close modal when the button or overlay is clicked
modalCloseBtn.addEventListener('click', hideModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        hideModal();
    }
});


// --- Registration Form Elements ---
const registerForm = document.getElementById('registerForm');

if (registerForm) {
    const roleToggle = document.querySelector('.role-toggle');
    const roleInput = document.getElementById('role');
    
    // Role toggle logic
    roleToggle.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            roleToggle.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            roleInput.value = e.target.dataset.role;
        }
    });

    // Registration submission handler
    registerForm.addEventListener('submit', handleRegister);
}


async function handleRegister(e) {
    e.preventDefault();

    const btnText = document.getElementById('btn-text');
    const btnLoader = document.getElementById('btn-loader');
    
    // --- Input Fields ---
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const termsCheckbox = document.getElementById('terms');
    const termsLabel = document.querySelector('.form-group-checkbox label');
    const roleInput = document.getElementById('role');

    const formInputs = [firstNameInput, lastNameInput, emailInput, passwordInput, confirmPasswordInput];

    // 1. Clear all previous error highlights
    formInputs.forEach(input => input.classList.remove('is-invalid'));
    termsLabel.classList.remove('is-invalid');

    // 2. Perform Validation and Highlight Errors
    let errors = [];
    if (!roleInput.value) errors.push('Role');
    if (!firstNameInput.value) { errors.push('First Name'); firstNameInput.classList.add('is-invalid'); }
    if (!lastNameInput.value) { errors.push('Last Name'); lastNameInput.classList.add('is-invalid'); }
    if (!emailInput.value) { errors.push('Email'); emailInput.classList.add('is-invalid'); }
    if (!passwordInput.value) { errors.push('Password'); passwordInput.classList.add('is-invalid'); }
    if (passwordInput.value !== confirmPasswordInput.value) {
        errors.push('Passwords do not match');
        passwordInput.classList.add('is-invalid');
        confirmPasswordInput.classList.add('is-invalid');
    }
    if (!termsCheckbox.checked) {
        errors.push('Terms');
        termsLabel.classList.add('is-invalid');
    }

    // 3. If there are any validation errors, show modal and stop
    if (errors.length > 0) {
        showModal('Missing Information', 'Please correct the highlighted fields and agree to the terms before continuing.', 'error');
        return;
    }

    // 4. If validation passes, proceed to Firebase
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        const user = userCredential.user;

        const fullName = `${firstNameInput.value.trim()} ${lastNameInput.value.trim()}`;

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            fullName: fullName,
            email: user.email,
            role: roleInput.value,
            createdAt: serverTimestamp(),
            balance: 0,
            status: 'active'
        });

        // Show success modal and set up redirect
        showModal('Registration Successful!', `Welcome, ${firstNameInput.value}! You will be redirected to your dashboard.`, 'success');
        modalCloseBtn.onclick = () => { // Redirect when user clicks "OK"
            window.location.href = roleInput.value === 'worker' ? '/worker/dashboard.html' : '/client/dashboard.html';
        };
        setTimeout(() => { // Also redirect automatically after 3 seconds
             window.location.href = roleInput.value === 'worker' ? '/worker/dashboard.html' : '/client/dashboard.html';
        }, 3000);

    } catch (error) {
        let friendlyMessage = "An unexpected error occurred. Please try again.";
        if (error.code === 'auth/email-already-in-use') {
            friendlyMessage = "This email address is already registered. Please try logging in.";
            emailInput.classList.add('is-invalid');
        }
        showModal('Registration Failed', friendlyMessage, 'error');
    } finally {
        btnText.style.display = 'inline-block';
        btnLoader.style.display = 'none';
    }
}


// --- NOTE: Login Logic would go here for login.html ---
// You would need to add similar logic for the login form if it's on a different page
// or adapt this script to handle both. This version is focused on registration.