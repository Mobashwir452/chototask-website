// === FILE: /client/js/client-personal-info.js (FINAL CORRECTED VERSION) ===

import { auth, db } from '/js/firebase-config.js';
import { doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your ImgBB API Key
const IMGBB_API_KEY = '2b154785f011c31f9c3b3a7ebae0f082';

document.addEventListener('componentsLoaded', () => {
    // Form elements
    const profileForm = document.getElementById('profile-form');
    const usernameInput = document.getElementById('username');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const aboutMeInput = document.getElementById('aboutMe');
    const addressSaveBtn = document.getElementById('address-save-btn');
    const addressInput = document.getElementById('address');
    const countryInput = document.getElementById('country');
    
    // KYC elements
    const kycStatusDiv = document.getElementById('kyc-status');
    const kycStatusText = document.getElementById('kyc-status-text');
    const kycInstructions = document.getElementById('kyc-instructions');
    const kycUploadBtn = document.getElementById('kyc-upload-btn');
    const kycFileInput = document.getElementById('kyc-file-input');

    // Avatar elements
    const avatarPreview = document.getElementById('avatar-preview');
    const initialsAvatar = document.getElementById('initials-avatar');
    const avatarUploadInput = document.getElementById('avatar-upload-input');
    const removeAvatarBtn = document.getElementById('remove-avatar-btn');

    let currentUserId = null;

function showModal(type, title, message) {
    const modalOverlay = document.getElementById('custom-notification-modal');
    if (!modalOverlay) return;

    // --- NEW: Event listeners to close the modal ---
    // Check if listeners are already attached to prevent duplicates
    if (!modalOverlay.dataset.listenersAttached) {
        const closeModal = () => modalOverlay.classList.remove('is-visible');
        
        const closeBtn = modalOverlay.querySelector('.modal-btn-ok');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });

        modalOverlay.dataset.listenersAttached = 'true';
    }
    // --- END of new logic ---

    const modalIcon = modalOverlay.querySelector('.modal-icon');
    const modalTitle = modalOverlay.querySelector('.modal-title');
    const modalMessage = modalOverlay.querySelector('.modal-message');

    modalIcon.className = `modal-icon ${type}`;
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    
    modalOverlay.classList.add('is-visible');
}

    // --- RENDER FUNCTION ---
    const renderProfileData = (userData) => {
        if (!userData) return;
        usernameInput.value = userData.username || '';
        fullNameInput.value = userData.fullName || '';
        emailInput.value = auth.currentUser.email;
        phoneInput.value = userData.phone || '';
        addressInput.value = userData.address || '';
        aboutMeInput.value = userData.aboutMe || '';
        countryInput.value = userData.country || '';

        if (userData.photoURL) {
            avatarPreview.src = userData.photoURL;
            avatarPreview.style.display = 'block';
            initialsAvatar.style.display = 'none';
        } else {
            const fullName = userData.fullName || auth.currentUser.displayName || '';
            const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            initialsAvatar.textContent = initials || '?';
            avatarPreview.style.display = 'none';
            initialsAvatar.style.display = 'flex';
        }
        
        const status = userData.kycStatus || 'unverified';
        kycStatusDiv.className = `kyc-status kyc-status--${status.replace('_', '-')}`;
        kycStatusText.textContent = status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        kycInstructions.textContent = (status === 'verified') ? "Your account is verified." : (status === 'pending_review') ? "Your document is under review." : "Please upload a clear image of your National ID.";
        kycUploadBtn.style.display = (status === 'verified' || status === 'pending_review') ? 'none' : 'inline-block';
    };

    // --- UPLOAD LOGIC ---
    const handleAvatarUpload = async (file) => {
        if (!IMGBB_API_KEY) return showModal('error', 'Configuration Error', 'ImgBB API Key is not configured.');
        
        try {
            const formData = new FormData();
            formData.append('image', file);
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
            const result = await response.json();
            if (!result.success) throw new Error(result.error.message);

            const userDocRef = doc(db, 'users', currentUserId);
            await updateDoc(userDocRef, { photoURL: result.data.url });
            await updateProfile(auth.currentUser, { photoURL: result.data.url });
            
            showModal('success', 'Success!', 'Profile picture updated successfully!');
        } catch (error) {
            console.error('Avatar Upload Error:', error);
            showModal('error', 'Upload Failed', `Upload failed: ${error.message}`);
        }
    };

const handleRemoveAvatar = async () => {
    // We will build a custom confirmation modal later. For now, we proceed directly.
    try {
        const userDocRef = doc(db, 'users', currentUserId);
        await updateDoc(userDocRef, { photoURL: "" }); // Set to empty string
        await updateProfile(auth.currentUser, { photoURL: "" });
        
        showModal('success', 'Success!', 'Profile picture removed.');
    } catch (error) {
        console.error('Error removing avatar:', error);
        showModal('error', 'Error', 'Could not remove profile picture.');
    }
};

    const handleKycUpload = async (file) => {
        if (!IMGBB_API_KEY) return showModal('error', 'Configuration Error', 'ImgBB API Key is not configured.');
        kycUploadBtn.textContent = 'Uploading...';
        
        try {
            const formData = new FormData();
            formData.append('image', file);
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
            const result = await response.json();
            if (!result.success) throw new Error(result.error.message);

            const userDocRef = doc(db, 'users', currentUserId);
            await updateDoc(userDocRef, {
                kycDocumentUrl: result.data.url,
                kycStatus: 'pending_review'
            });
        } catch (error) {
            console.error('KYC Upload Error:', error);
            showModal('error', 'Upload Failed', `Upload failed: ${error.message}`);
        } finally {
            kycUploadBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload Document';
        }
    };

    // --- EVENT LISTENERS ---
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = profileForm.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        
        const dataToUpdate = {
            username: usernameInput.value.trim(),
            fullName: fullNameInput.value.trim(),
            phone: phoneInput.value.trim(),
            aboutMe: aboutMeInput.value.trim(),
        };

        try {
            const userDocRef = doc(db, 'users', currentUserId);
            await updateDoc(userDocRef, dataToUpdate);
            if (auth.currentUser.displayName !== dataToUpdate.fullName) {
                await updateProfile(auth.currentUser, { displayName: dataToUpdate.fullName });
            }
            showModal('success', 'Success!', 'Public info updated successfully!');
        } catch (error) {
            console.error("Error updating profile:", error);
            showModal('error', 'Error', 'Failed to update public profile. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Public Info';
        }
    });

    addressSaveBtn.addEventListener('click', async () => {
        addressSaveBtn.disabled = true;
        addressSaveBtn.textContent = 'Saving...';
        
        try {
            const userDocRef = doc(db, 'users', currentUserId);
            await updateDoc(userDocRef, {
                address: addressInput.value.trim(),
                country: countryInput.value,
            });
            showModal('success', 'Success!', 'Address info updated successfully!');
        } catch (error) {
            console.error("Error updating address:", error);
            showModal('error', 'Error', 'Failed to update address. Please try again.');
        } finally {
            addressSaveBtn.disabled = false;
            addressSaveBtn.textContent = 'Save Address Info';
        }
    });

    avatarUploadInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                avatarPreview.src = event.target.result;
                avatarPreview.style.display = 'block';
                initialsAvatar.style.display = 'none';
            };
            reader.readAsDataURL(file);
            handleAvatarUpload(file);
        }
    });
    
    removeAvatarBtn.addEventListener('click', handleRemoveAvatar);
    kycFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleKycUpload(e.target.files[0]);
    });

    // --- INITIALIZATION ---
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