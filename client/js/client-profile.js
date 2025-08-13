// FILE: /js/client-profile.js (FINAL, CORRECTED VERSION)

import { auth, db } from '/js/firebase-config.js';
import { doc, onSnapshot, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// Using ImgBB as requested
// import { ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Your Imgur/ImgBB API Key if you are using it
const IMGBB_API_KEY = '2b154785f011c31f9c3b3a7ebae0f082'; // Replace with your key

document.addEventListener('componentsLoaded', () => {

    const profilePictureWrapper = document.getElementById('profile-picture-wrapper');
    const profilePicture = document.getElementById('profile-picture');
    const initialsAvatar = document.getElementById('initials-avatar');
    const fileInput = document.getElementById('profile-picture-input');
    const updateBtn = document.getElementById('update-picture-btn');
    const removeBtn = document.getElementById('remove-picture-btn');
    const profileNameEl = document.getElementById('profile-name');
    const profileEmailEl = document.getElementById('profile-email');
    const planBadgeWrapper = document.getElementById('plan-badge-wrapper');
    const upgradeCard = document.getElementById('upgrade-prompt-card');

    const getInitials = (name) => {
        if (!name || name === 'Client Name') return '?';
        const names = name.split(' ');
        const firstInitial = names[0][0] || '';
        const lastInitial = names.length > 1 ? names[names.length - 1][0] : '';
        return `${firstInitial}${lastInitial}`.toUpperCase();
    };

    const renderProfile = (user, userData) => {
        if (!user) return;

        // ✅ THE FIX IS HERE: We now look for 'fullName' from your database.
        let name = 'Client Name'; // Default fallback
        if (userData?.fullName) {
            name = userData.fullName; // Use the correct field from Firestore
        } else if (user.displayName) {
            name = user.displayName;
        }
        
        profileNameEl.textContent = name;
        profileEmailEl.textContent = user.email || 'No email provided';

        const photoURL = user.photoURL || userData?.photoURL;
        if (photoURL) {
            profilePicture.src = photoURL;
            profilePicture.style.display = 'block';
            initialsAvatar.style.display = 'none';
        } else {
            initialsAvatar.textContent = getInitials(name);
            profilePicture.style.display = 'none';
            initialsAvatar.style.display = 'flex';
        }
        
        const accountType = userData?.accountType || 'free';
        if (accountType === 'premium') {
            planBadgeWrapper.innerHTML = `<div class="plan-badge plan-badge--premium"><i class="fa-solid fa-star"></i> Premium</div>`;
            upgradeCard.style.display = 'none';
        } else {
            planBadgeWrapper.innerHTML = `<div class="plan-badge plan-badge--free"><i class="fa-solid fa-user"></i> Free</div>`;
            upgradeCard.style.display = 'block';
        }
    };

    const handleProfilePictureUpload = async (file) => {
        // Your existing Imgur/ImgBB upload logic goes here.
        if (!auth.currentUser || !IMGBB_API_KEY || IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY') {
            alert('ImgBB API Key is not configured.');
            return;
        }
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }
        profilePictureWrapper.style.opacity = '0.5';
        const formData = new FormData();
        formData.append('image', file);
        try {
            const apiUrl = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;
            const response = await fetch(apiUrl, { method: 'POST', body: formData });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error?.message || 'Failed to upload to ImgBB.');
            }
            const imgbbLink = result.data.url;
            await updateProfile(auth.currentUser, { photoURL: imgbbLink });
            const userDocRef = doc(db, "users", auth.currentUser.uid);
            await setDoc(userDocRef, { photoURL: imgbbLink }, { merge: true });
        } catch (error) {
            console.error("Error uploading profile picture:", error);
            alert(`Upload failed: ${error.message}`);
        } finally {
            profilePictureWrapper.style.opacity = '1';
        }
    };


// ✅ NEW: A reusable function to show the custom confirmation modal
const showConfirmationModal = (title, message) => {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmation-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const confirmBtn = document.getElementById('modal-confirm-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');

        modalTitle.textContent = title;
        modalMessage.textContent = message;

        modal.classList.add('is-visible');

        const close = (confirmation) => {
            modal.classList.remove('is-visible');
            // Clone and replace buttons to remove event listeners
            confirmBtn.replaceWith(confirmBtn.cloneNode(true));
            cancelBtn.replaceWith(cancelBtn.cloneNode(true));
            resolve(confirmation);
        };

        confirmBtn.addEventListener('click', () => close(true));
        cancelBtn.addEventListener('click', () => close(false));
    });
};



// ✅ UPDATED: The 'handleRemovePicture' function now uses the new modal
const handleRemovePicture = async () => {
    if (!auth.currentUser) return;

    // Replace the old `confirm()` with our new async modal
    const confirmed = await showConfirmationModal(
        'Remove Picture', 
        'Are you sure you want to remove your profile picture? This action cannot be undone.'
    );

    if (!confirmed) return; // If user clicks cancel, stop here.

    try {
        await updateProfile(auth.currentUser, { photoURL: "" });
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userDocRef, { photoURL: null });
    } catch (error) {
        console.error("Error removing profile picture:", error);
        alert("Could not remove profile picture. Please try again.");
    }
};

    // --- EVENT LISTENERS ---
    updateBtn.addEventListener('click', () => fileInput.click());
    removeBtn.addEventListener('click', handleRemovePicture);
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleProfilePictureUpload(e.target.files[0]);
        }
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            onSnapshot(userDocRef, (doc) => {
                const userData = doc.exists() ? doc.data() : null;
                renderProfile(user, userData);
            });
        }
    });
});