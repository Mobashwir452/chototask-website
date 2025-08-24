// FILE: /worker/js/worker-notifications.js

import { auth, db } from '/js/firebase-config.js';
import { doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {

    // Get references to the new worker toggle switch inputs
    const approvalToggle = document.getElementById('approval-toggle');
    const rejectionToggle = document.getElementById('rejection-toggle');
    const newJobsToggle = document.getElementById('new-jobs-toggle');
    const withdrawalToggle = document.getElementById('withdrawal-toggle');
    const promoToggle = document.getElementById('promo-toggle');

    let userDocRef = null;
    let isUpdating = false; // Flag to prevent write loops on initial load

    // Function to populate the UI with data from Firestore
    const renderSettings = (userData) => {
        isUpdating = true;
        if (userData) {
            approvalToggle.checked = userData.notification_onApproval || false;
            rejectionToggle.checked = userData.notification_onRejection || false;
            newJobsToggle.checked = userData.notification_onNewJobs || false;
            withdrawalToggle.checked = userData.notification_onWithdrawal || false;
            promoToggle.checked = userData.notification_onPromo || false;
        }
        setTimeout(() => { isUpdating = false; }, 100);
    };

    // A single function to update a setting in Firestore
    const updateSetting = async (field, value) => {
        if (!userDocRef || isUpdating) return;
        try {
            await updateDoc(userDocRef, { [field]: value });
        } catch (error) {
            console.error(`Error updating setting ${field}:`, error);
        }
    };

    // Add event listeners to each worker-specific toggle
    approvalToggle.addEventListener('change', (e) => updateSetting('notification_onApproval', e.target.checked));
    rejectionToggle.addEventListener('change', (e) => updateSetting('notification_onRejection', e.target.checked));
    newJobsToggle.addEventListener('change', (e) => updateSetting('notification_onNewJobs', e.target.checked));
    withdrawalToggle.addEventListener('change', (e) => updateSetting('notification_onWithdrawal', e.target.checked));
    promoToggle.addEventListener('change', (e) => updateSetting('notification_onPromo', e.target.checked));

    // Main listener for user authentication state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            userDocRef = doc(db, 'users', user.uid);
            onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    renderSettings(docSnap.data());
                } else {
                    console.log("No user profile data found!");
                }
            });
        } else {
            window.location.href = '/login.html';
        }
    });
});