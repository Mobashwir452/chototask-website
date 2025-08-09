// FILE: /js/auth.js (FINAL, REVISED VERSION)

import { auth, db } from '/js/firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, 
    setDoc,
    getDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- MODAL & LOADER FUNCTIONS ---
const modal = document.getElementById('feedback-modal');
const modalIconContainer = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalCloseBtn = document.getElementById('modal-close-btn');

function showModal(title, message, type = 'error') {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalIconContainer.className = 'modal-icon';
    modalIconContainer.innerHTML = '';
    
    if (type === 'success') {
        modalIconContainer.classList.add('success');
        modalIconContainer.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else {
        modalIconContainer.classList.add('error');
        modalIconContainer.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    }
    modal.classList.add('is-visible');
}

function hideModal() {
    modal.classList.remove('is-visible');
}

modalCloseBtn.addEventListener('click', hideModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) hideModal();
});


// --- LOGIC ROUTER (REVISED) ---
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm'); // <-- GET NEW FORM
    const roleToggle = document.querySelector('.role-toggle');

    // FIX #1: Attach toggle logic if the element exists on the page
    if (roleToggle) {
        const roleInput = document.getElementById('role') || document.createElement('input'); // Handle login/register
        roleToggle.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                roleToggle.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                if(roleInput) roleInput.value = e.target.dataset.role;
            }
        });
    }

    // Attach form submission handlers
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    if (forgotPasswordForm) { // <-- ATTACH NEW HANDLER
        forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    }
});



// ===============================================
//           NEW: FORGOT PASSWORD HANDLER
// ===============================================
async function handleForgotPassword(e) {
    e.preventDefault();
    const btnText = document.getElementById('btn-text');
    const btnLoader = document.getElementById('btn-loader');
    const emailInput = document.getElementById('email');

    emailInput.classList.remove('is-invalid');
    if (!emailInput.value) {
        emailInput.classList.add('is-invalid');
        return showModal('Missing Email', 'Please enter your email address.', 'error');
    }

    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';

    try {
        await sendPasswordResetEmail(auth, emailInput.value);
        showModal(
            'Check Your Email', 
            `If an account exists for ${emailInput.value}, you will receive an email with password reset instructions. Please check your spam folder.`, 
            'success'
        );
    } catch (error) {
        // For security, show the same success message even if the email doesn't exist
        showModal(
            'Check Your Email', 
            `If an account exists for ${emailInput.value}, you will receive an email with password reset instructions. Please check your spam folder.`, 
            'success'
        );
    } finally {
        btnText.style.display = 'inline-block';
        btnLoader.style.display = 'none';
    }
}



// ===============================================
//                LOGIN HANDLER (REVISED)
// ===============================================
async function handleLogin(e) {
    e.preventDefault();
    const btnText = document.getElementById('btn-text');
    const btnLoader = document.getElementById('btn-loader');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    
    // FIX #2: Get the role selected by the user on the login page
    const selectedRole = document.querySelector('.role-toggle .role-btn.active').dataset.role;

    // Validation...
    emailInput.classList.remove('is-invalid');
    passwordInput.classList.remove('is-invalid');
    if (!emailInput.value || !passwordInput.value) {
        if (!emailInput.value) emailInput.classList.add('is-invalid');
        if (!passwordInput.value) passwordInput.classList.add('is-invalid');
        return showModal('Missing Fields', 'Please enter your email and password.', 'error');
    }

    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';

    try {
        const persistence = rememberMeCheckbox.checked ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistence);
        
        const userCredential = await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        const user = userCredential.user;
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists()) {
            const userData = userDoc.data();

            // FIX #2: Check if the selected role matches the user's actual role in the database
            if (userData.role !== selectedRole) {
                await signOut(auth); // Immediately sign the user out
                throw new Error("role-mismatch"); // Throw a custom error
            }

            // Roles match, proceed with success
            showModal('Login Successful!', 'Welcome back! Redirecting...', 'success');
            const redirectToDashboard = () => {
                switch (userData.role) {
                    case 'admin': window.location.href = '/admin/index.html'; break;
                    case 'worker': window.location.href = '/worker/dashboard.html'; break;
                    case 'client': window.location.href = '/client/dashboard.html'; break;
                    default: window.location.href = '/index.html';
                }
            };
            modalCloseBtn.onclick = redirectToDashboard;
            setTimeout(redirectToDashboard, 2000);

        } else {
            await signOut(auth); // Sign out if user exists in Auth but not in DB
            throw new Error("User data not found.");
        }

    } catch (error) {
        let friendlyMessage = "Invalid email or password. Please try again.";
        if (error.message === "role-mismatch") {
            friendlyMessage = "Login failed. You have selected the wrong role for this account.";
        } else if (error.message === "User data not found.") {
            friendlyMessage = "Could not find your user data. Please contact support.";
        }
        showModal('Login Failed', friendlyMessage, 'error');
        emailInput.classList.add('is-invalid');
        passwordInput.classList.add('is-invalid');
    } finally {
        btnText.style.display = 'inline-block';
        btnLoader.style.display = 'none';
    }
}


// ===============================================
//              REGISTRATION HANDLER
// ===============================================
async function handleRegister(e) {
    e.preventDefault();
    const btnText = document.getElementById('btn-text');
    const btnLoader = document.getElementById('btn-loader');
    
    // Input Fields
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const termsCheckbox = document.getElementById('terms');
    const termsLabel = document.querySelector('.form-group-checkbox label');
    const roleInput = document.getElementById('role');

    const formInputs = [firstNameInput, lastNameInput, emailInput, passwordInput, confirmPasswordInput];

    // 1. Clear previous errors
    formInputs.forEach(input => input.classList.remove('is-invalid'));
    termsLabel.classList.remove('is-invalid');

    // 2. Perform Validation
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

    if (errors.length > 0) {
        return showModal('Missing Information', 'Please correct the highlighted fields and agree to the terms.', 'error');
    }

    // 3. If validation passes, proceed to Firebase
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

        showModal('Registration Successful!', `Welcome, ${firstNameInput.value}! Redirecting...`, 'success');
        const redirectToDashboard = () => {
            window.location.href = roleInput.value === 'worker' ? '/worker/dashboard.html' : '/client/dashboard.html';
        };
        modalCloseBtn.onclick = redirectToDashboard;
        setTimeout(redirectToDashboard, 3000);

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