// FILE: /client/js/client-personal-info.js

import { auth, db } from '/js/firebase-config.js';
import { doc, onSnapshot, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your ImgBB API Key
const IMGBB_API_KEY = 'YOUR_IMGBB_API_KEY';

document.addEventListener('componentsLoaded', () => {
    // Form elements
    const profileForm = document.getElementById('profile-form');
    const usernameInput = document.getElementById('username');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const addressInput = document.getElementById('address');
    const formMessage = document.getElementById('form-message');
    
    // KYC elements
    const kycStatusDiv = document.getElementById('kyc-status');
    const kycStatusText = document.getElementById('kyc-status-text');
    const kycInstructions = document.getElementById('kyc-instructions');
    const kycUploadBtn = document.getElementById('kyc-upload-btn');
    const kycFileInput = document.getElementById('kyc-file-input');

    let currentUserId = null;

    const renderProfileData = (userData) => {
        if (!userData) return;
        usernameInput.value = userData.username || '';
        fullNameInput.value = userData.fullName || '';
        emailInput.value = auth.currentUser.email;
        phoneInput.value = userData.phone || '';
        addressInput.value = userData.address || '';

        // Render KYC Status
        const status = userData.kycStatus || 'unverified';
        kycStatusDiv.className = `kyc-status kyc-status--${status.replace('_', '-')}`;
        kycStatusText.textContent = status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

        if (status === 'verified') {
            kycInstructions.textContent = "Your account is verified. No further action needed.";
            kycUploadBtn.style.display = 'none';
        } else if (status === 'pending_review') {
            kycInstructions.textContent = "Your document is under review. Please wait.";
            kycUploadBtn.style.display = 'none';
        } else {
            kycInstructions.textContent = "Please upload a clear image of your National ID to get verified.";
            kycUploadBtn.style.display = 'block';
        }
    };

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = profileForm.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const dataToUpdate = {
            username: usernameInput.value.trim(),
            fullName: fullNameInput.value.trim(),
            phone: phoneInput.value.trim(),
            address: addressInput.value.trim(),
        };

        try {
            const userDocRef = doc(db, 'users', currentUserId);
            await updateDoc(userDocRef, dataToUpdate);
            await updateProfile(auth.currentUser, { displayName: dataToUpdate.fullName });
            
            formMessage.textContent = 'Profile updated successfully!';
            formMessage.className = 'form-message message-success';
        } catch (error) {
            console.error("Error updating profile:", error);
            formMessage.textContent = 'Failed to update profile. Please try again.';
            formMessage.className = 'form-message message-error';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Changes';
        }
    });

    const handleKycUpload = async (file) => {
        if (!IMGBB_API_KEY || IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY') {
            return alert('ImgBB API Key is not configured.');
        }

        kycUploadBtn.textContent = 'Uploading...';
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
            const result = await response.json();
            if (!result.success) throw new Error(result.error.message);

            const userDocRef = doc(db, 'users', currentUserId);
            await updateDoc(userDocRef, {
                kycDocumentUrl: result.data.url,
                kycStatus: 'pending_review'
            });
            // The onSnapshot listener will automatically update the UI status.

        } catch (error) {
            console.error('KYC Upload Error:', error);
            alert(`Upload failed: ${error.message}`);
        } finally {
            kycUploadBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload Document';
        }
    };

    kycFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleKycUpload(e.target.files[0]);
        }
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            const userDocRef = doc(db, 'users', currentUserId);
            onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    renderProfileData(docSnap.data());
                }
            });
        } else {
            window.location.href = '/login.html';
        }
    });
});