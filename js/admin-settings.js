// FILE: /js/admin-settings.js

import { db } from '/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const listContainer = document.getElementById('payment-methods-list');

// Function to render the list of payment methods
const renderMethods = (methods = []) => {
    if (!listContainer) return;

    if (methods.length === 0) {
        listContainer.innerHTML = `<p class="a-empty">No payment methods configured. Click 'Add New Method' to start.</p>`;
        return;
    }

    listContainer.innerHTML = methods.map(method => `
        <div class="payment-method-item" data-id="${method.id}">
            <div class="payment-method-info">
                <strong>${method.name}</strong>
                <span>${method.accountDetails || ''}</span>
            </div>
            <div class="a-actions">
                <button class="a-action-btn edit" title="Edit Method"><i class="fa-solid fa-pencil"></i></button>
                <button class="a-action-btn delete" title="Delete Method"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        </div>
    `).join('');
};

// Main function to load data from Firestore
const loadPaymentMethods = async () => {
    try {
        const settingsRef = doc(db, "settings", "paymentMethods");
        const docSnap = await getDoc(settingsRef);

        if (docSnap.exists() && docSnap.data().methods) {
            renderMethods(docSnap.data().methods);
        } else {
            // If the document or array doesn't exist, render an empty state
            renderMethods([]);
        }
    } catch (error) {
        console.error("Error fetching payment methods:", error);
        listContainer.innerHTML = `<p class="a-empty">Error loading data. Please check the console.</p>`;
    }
};

// Wait for the admin guard to confirm the user is an admin
document.addEventListener('adminReady', () => {
    loadPaymentMethods();
});