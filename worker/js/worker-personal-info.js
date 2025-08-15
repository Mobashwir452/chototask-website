// FILE: /worker/js/worker-personal-info.js

import { auth, db } from '/js/firebase-config.js';
import { doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your ImgBB API Key
const IMGBB_API_KEY = '2b154785f011c31f9c3b3a7ebae0f082';

document.addEventListener('componentsLoaded', () => {
    const profileForm = document.getElementById('profile-form');
    const formMessage = document.getElementById('form-message');
    let currentUserId = null;

    // Card 1 Fields
    const usernameInput = document.getElementById('username');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');

    // Card 2 Fields
    const headlineInput = document.getElementById('headline');
    const bioInput = document.getElementById('bio');
    const skillsInput = document.getElementById('skills');

    // Card 3 Fields
    const addressInput = document.getElementById('address');
    const kycStatusDiv = document.getElementById('kyc-status');
    const kycStatusText = document.getElementById('kyc-status-text');
    const kycInstructions = document.getElementById('kyc-instructions');
    const kycUploadBtn = document.getElementById('kyc-upload-btn');
    const kycFileInput = document.getElementById('kyc-file-input');

    // Card 4 Fields
    const withdrawalMethodInput = document.getElementById('withdrawal-method');
    const accountNumberInput = document.getElementById('account-number');

    const renderProfileData = (userData) => {
        if (!userData) return;
        usernameInput.value = userData.username || '';
        fullNameInput.value = userData.fullName || '';
        emailInput.value = auth.currentUser.email;
        phoneInput.value = userData.phone || '';
        headlineInput.value = userData.headline || '';
        bioInput.value = userData.bio || '';
        skillsInput.value = (userData.skills || []).join(', ');
        addressInput.value = userData.address || '';
        withdrawalMethodInput.value = userData.withdrawalMethod || '';
        accountNumberInput.value = userData.accountNumber || '';

        // Render KYC Status
        const status = userData.kycStatus || 'unverified';
        kycStatusDiv.className = `kyc-status kyc-status--${status.replace('_', '-')}`;
        kycStatusText.textContent = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

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
        
        const skillsArray = skillsInput.value.split(',').map(s => s.trim()).filter(Boolean);

        const dataToUpdate = {
            username: usernameInput.value.trim(),
            fullName: fullNameInput.value.trim(),
            phone: phoneInput.value.trim(),
            headline: headlineInput.value.trim(),
            bio: bioInput.value.trim(),
            skills: skillsArray,
            address: addressInput.value.trim(),
            withdrawalMethod: withdrawalMethodInput.value,
            accountNumber: accountNumberInput.value.trim(),
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
            submitBtn.textContent = 'Save All Changes';
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
                } else {
                    renderProfileData({}); // Render empty form
                }
            });
        } else {
            window.location.href = '/login.html';
        }
    });
});