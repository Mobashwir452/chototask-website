// FILE: /worker/js/worker-profile.js (FINAL & COMPLETE)

import { auth, db } from '/js/firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, getCountFromServer, collectionGroup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {

    // --- DOM Elements ---
    const profileHeader = document.getElementById('profile-header');
    const workerStatsGrid = document.getElementById('worker-stats-grid');
    const upgradeCard = document.getElementById('upgrade-prompt-card');
    const fileInput = document.getElementById('profile-picture-input'); // Ensure this is in your HTML
    let currentUserId = null;

    // --- CONFIGURATION ---
    const IMGBB_API_KEY = '2b154785f011c31f9c3b3a7ebae0f082'; // Your ImgBB Key

    // --- HELPER FUNCTIONS ---
    const getInitials = (name) => {
        if (!name) return '?';
        const names = name.split(' ');
        return `${names[0][0] || ''}${names.length > 1 ? names[names.length - 1][0] : ''}`.toUpperCase();
    };

    // --- RENDER FUNCTIONS ---
    const renderProfileHeader = (user, userData) => {
        const name = userData?.fullName || user?.displayName || 'Worker';
        const email = user?.email || 'No email';
        const photoURL = userData?.photoURL || user?.photoURL;
        const accountType = userData?.accountType || 'free';

        let avatarHTML = photoURL 
            ? `<img id="profile-picture" src="${photoURL}" alt="Profile Picture">` 
            : `<div class="initials-avatar" id="initials-avatar">${getInitials(name)}</div>`;

        let planBadgeHTML = accountType === 'premium'
            ? `<div class="plan-badge plan-badge--premium"><i class="fa-solid fa-star"></i> Premium</div>`
            : `<div class="plan-badge plan-badge--free"><i class="fa-solid fa-user"></i> Free</div>`;
        
        if (accountType === 'free' && upgradeCard) {
            upgradeCard.style.display = 'block';
        }

        profileHeader.innerHTML = `
            <div class="profile-picture-wrapper" id="profile-picture-wrapper">
                ${avatarHTML}
                <div class="update-picture-overlay">
                    <button id="update-picture-btn" class="overlay-icon-btn" title="Update Picture">
                        <i class="fa-solid fa-camera"></i>
                    </button>
                    <button id="remove-picture-btn" class="overlay-icon-btn remove" title="Remove Picture">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
            <input type="file" id="profile-picture-input" accept="image/jpeg, image/png" style="display:none;">
            <div class="profile-info">
                <h2 class="profile-name">${name}</h2>
                <p class="profile-email">${email}</p>
            </div>
            <div class="plan-badge-wrapper">${planBadgeHTML}</div>
        `;
    };

    const renderWorkerStats = (stats, wallet) => {
        const totalReviewed = (stats.approved || 0) + (stats.rejected || 0);
        const approvalRate = totalReviewed > 0 ? ((stats.approved / totalReviewed) * 100).toFixed(1) : 100;

        workerStatsGrid.innerHTML = `
            <div class="kpi-card">
                <div class="kpi-card__icon"><i class="fa-solid fa-sack-dollar"></i></div>
                <div class="kpi-card__value">৳${(wallet?.totalEarned || 0).toLocaleString()}</div>
                <p class="kpi-card__title">Lifetime Earnings</p>
            </div>
            <div class="kpi-card">
                <div class="kpi-card__icon"><i class="fa-solid fa-check-double"></i></div>
                <div class="kpi-card__value">${stats.approved || 0}</div>
                <p class="kpi-card__title">Jobs Completed</p>
            </div>
            <div class="kpi-card">
                <div class="kpi-card__icon"><i class="fa-solid fa-percent"></i></div>
                <div class="kpi-card__value">${approvalRate}%</div>
                <p class="kpi-card__title">Approval Rate</p>
            </div>
            <div class="kpi-card">
                <div class="kpi-card__icon"><i class="fa-solid fa-hourglass-half"></i></div>
                <div class="kpi-card__value">${stats.pending || 0}</div>
                <p class="kpi-card__title">Pending Submissions</p>
            </div>
        `;
    };

    // --- CORE LOGIC FUNCTIONS ---
    const showConfirmationModal = (title, message) => {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmation-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalMessage = document.getElementById('modal-message');
            const confirmBtn = document.getElementById('modal-confirm-btn');
            const cancelBtn = document.getElementById('modal-cancel-btn');

            if (!modal) {
                // Fallback to browser confirm if modal HTML is missing
                resolve(confirm(message));
                return;
            }

            modalTitle.textContent = title;
            modalMessage.textContent = message;
            modal.classList.add('is-visible');

            const onConfirm = () => {
                modal.classList.remove('is-visible');
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                resolve(true);
            };
            const onCancel = () => {
                modal.classList.remove('is-visible');
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                resolve(false);
            };
            
            confirmBtn.addEventListener('click', onConfirm);
            cancelBtn.addEventListener('click', onCancel);
        });
    };

    const handleProfilePictureUpload = async (file) => {
        if (!auth.currentUser || !IMGBB_API_KEY) {
            alert('API Key is not configured.');
            return;
        }
        
        const formData = new FormData();
        formData.append('image', file);
        try {
            const apiUrl = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;
            const response = await fetch(apiUrl, { method: 'POST', body: formData });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error?.message || 'Failed to upload image.');
            }
            
            const newPhotoURL = result.data.url;
            await updateProfile(auth.currentUser, { photoURL: newPhotoURL });
            await setDoc(doc(db, "users", auth.currentUser.uid), { photoURL: newPhotoURL }, { merge: true });

        } catch (error) {
            console.error("Error uploading profile picture:", error);
            alert(`Upload failed: ${error.message}`);
        }
    };

    const handleRemovePicture = async () => {
        if (!auth.currentUser) return;
        const confirmed = await showConfirmationModal(
            'Remove Picture', 
            'Are you sure you want to remove your profile picture? This action cannot be undone.'
        );

        if (!confirmed) return;

        try {
            await updateProfile(auth.currentUser, { photoURL: "" });
            await updateDoc(doc(db, "users", auth.currentUser.uid), { photoURL: null });
        } catch (error) {
            console.error("Error removing profile picture:", error);
            alert("Could not remove picture. Please try again.");
        }
    };

    // --- DATA FETCHING ---
    const fetchWorkerData = async (userId) => {
        try {
            const userDocRef = doc(db, "users", userId);
            const walletDocRef = doc(db, "wallets", userId);
            const submissionsRef = collectionGroup(db, 'submissions');

            // Use onSnapshot to listen for real-time user/wallet updates
            onSnapshot(userDocRef, (userDoc) => {
                const userData = userDoc.exists() ? userDoc.data() : {};
                onSnapshot(walletDocRef, (walletDoc) => {
                    const walletData = walletDoc.exists() ? walletDoc.data() : {};
                    renderProfileHeader(auth.currentUser, userData);
                    // We need stats to render the full card, so we'll do it after stats are fetched.
                });
            });
            
            // Get submission stats once
            const approvedQuery = query(submissionsRef, where("workerId", "==", userId), where("status", "==", "approved"));
            const rejectedQuery = query(submissionsRef, where("workerId", "==", userId), where("status", "==", "rejected"));
            const pendingQuery = query(submissionsRef, where("workerId", "==", userId), where("status", "==", "pending"));

            const [approvedSnap, rejectedSnap, pendingSnap, walletSnap] = await Promise.all([
                getCountFromServer(approvedQuery),
                getCountFromServer(rejectedQuery),
                getCountFromServer(pendingQuery),
                getDoc(walletDocRef)
            ]);
            
            const stats = {
                approved: approvedSnap.data().count,
                rejected: rejectedSnap.data().count,
                pending: pendingSnap.data().count
            };
            const walletData = walletSnap.exists() ? walletSnap.data() : {};
            
            renderWorkerStats(stats, walletData);

        } catch (error) {
            console.error("Error fetching worker profile data:", error);
        }
    };
    
    // --- EVENT LISTENERS & INITIALIZATION ---
    document.addEventListener('click', (e) => {
        // Use event delegation for dynamically added elements
        const updateBtn = e.target.closest('#update-picture-btn');
        const removeBtn = e.target.closest('#remove-picture-btn');
        const fileInput = document.getElementById('profile-picture-input');

        if (updateBtn) {
            fileInput?.click();
        }
        if (removeBtn) {
            handleRemovePicture();
        }
    });
    
    document.addEventListener('change', (e) => {
        if (e.target.id === 'profile-picture-input' && e.target.files && e.target.files[0]) {
            handleProfilePictureUpload(e.target.files[0]);
        }
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            fetchWorkerData(currentUserId);
        }
    });
});