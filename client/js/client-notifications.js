// FILE: /client/js/client-notifications.js

import { auth, db } from '/js/firebase-config.js';
import { doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {

    // Get references to the toggle switch inputs
    const submissionToggle = document.getElementById('submission-toggle');
    const jobCompleteToggle = document.getElementById('job-complete-toggle');
    const depositToggle = document.getElementById('deposit-toggle');
    const promoToggle = document.getElementById('promo-toggle');

    let userDocRef = null;
    let isUpdating = false; // A flag to prevent loops

    // Function to populate the UI with data from Firestore
    const renderSettings = (userData) => {
        isUpdating = true; // Set flag to prevent save on initial load
        if (userData) {
            submissionToggle.checked = userData.notification_onSubmission || false;
            jobCompleteToggle.checked = userData.notification_onJobComplete || false;
            depositToggle.checked = userData.notification_onDeposit || false;
            promoToggle.checked = userData.notification_onPromo || false;
        }
        // Use a short timeout to reset the flag after the UI has been populated
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

    // Add event listeners to each toggle
    submissionToggle.addEventListener('change', (e) => updateSetting('notification_onSubmission', e.target.checked));
    jobCompleteToggle.addEventListener('change', (e) => updateSetting('notification_onJobComplete', e.target.checked));
    depositToggle.addEventListener('change', (e) => updateSetting('notification_onDeposit', e.target.checked));
    promoToggle.addEventListener('change', (e) => updateSetting('notification_onPromo', e.target.checked));

    // Main listener for user authentication state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            userDocRef = doc(db, 'users', user.uid);
            // Listen for real-time updates to the user's document
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