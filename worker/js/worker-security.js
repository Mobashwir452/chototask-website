// FILE: /worker/js/worker-security.js

import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('componentsLoaded', () => {
    // Password form elements
    const passwordForm = document.getElementById('change-password-form');
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
    const formMessage = document.getElementById('form-message');

    // Toggle switch elements
    const isProfilePublicToggle = document.getElementById('isProfilePublicToggle');
    const showActivityStatusToggle = document.getElementById('showActivityStatusToggle');
    const allowDataCollectionToggle = document.getElementById('allowDataCollectionToggle');

    let currentUserId = null;
    let userDocRef = null;

    const setFormMessage = (message, isError = false) => {
        formMessage.textContent = message;
        formMessage.className = isError ? 'form-message message-error' : 'form-message message-success';
    };

    // --- Data & Privacy Toggles Logic ---
    const updateSetting = async (field, value) => {
        if (!userDocRef) return;
        try {
            await updateDoc(userDocRef, { [field]: value });
        } catch (error) {
            console.error(`Error updating setting ${field}:`, error);
        }
    };
    
    isProfilePublicToggle.addEventListener('change', (e) => updateSetting('isProfilePublic', e.target.checked));
    showActivityStatusToggle.addEventListener('change', (e) => updateSetting('showActivityStatus', e.target.checked));
    allowDataCollectionToggle.addEventListener('change', (e) => updateSetting('allowDataCollection', e.target.checked));

    // --- Change Password Logic ---
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = passwordForm.querySelector('.btn-submit');
        setFormMessage('');

        if (newPasswordInput.value !== confirmNewPasswordInput.value) {
            return setFormMessage('New passwords do not match.', true);
        }
        if (newPasswordInput.value.length < 6) {
            return setFormMessage('New password must be at least 6 characters.', true);
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';

        try {
            const user = auth.currentUser;
            const credential = EmailAuthProvider.credential(user.email, currentPasswordInput.value);
            
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPasswordInput.value);

            setFormMessage('Password updated successfully!');
            passwordForm.reset();

        } catch (error) {
            console.error("Password update error:", error);
            if (error.code === 'auth/wrong-password') {
                setFormMessage('The current password you entered is incorrect.', true);
            } else {
                setFormMessage('An error occurred. Please try again.', true);
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Password';
        }
    });

    // --- Main Auth Listener ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            userDocRef = doc(db, 'users', currentUserId);

            onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    isProfilePublicToggle.checked = userData.isProfilePublic || false;
                    showActivityStatusToggle.checked = userData.showActivityStatus || false;
                    allowDataCollectionToggle.checked = userData.allowDataCollection || false;
                }
            });
        } else {
            window.location.href = '/login.html';
        }
    });
});