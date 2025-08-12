// FILE: /js/admin-settings.js

import { db } from '/js/firebase-config.js';
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- DOM ELEMENTS ---
const listContainer = document.getElementById('payment-methods-list');
const addMethodBtn = document.getElementById('add-method-btn');
const adminModal = document.getElementById('admin-modal');
const modalTitle = document.getElementById('admin-modal-title');
const modalBody = document.getElementById('admin-modal-body');
const modalCloseBtn = document.getElementById('admin-modal-close-btn');

// --- MODAL CONTROLS ---
const showAdminModal = () => adminModal.style.display = 'flex';
const hideAdminModal = () => adminModal.style.display = 'none';
modalCloseBtn.addEventListener('click', hideAdminModal);
adminModal.addEventListener('click', (e) => {
    if (e.target === adminModal) hideAdminModal();
});

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


// This function is called when the "Add New Method" button is clicked
const handleAddMethod = () => {
    modalTitle.textContent = "Add New Payment Method";
    modalBody.innerHTML = `
        <form id="payment-method-form">
            <div class="form-group">
                <label for="method-name">Method Name</label>
                <input type="text" id="method-name" class="a-search" placeholder="e.g., Bkash Personal" required>
            </div>
            <div class="form-group" style="margin-top: 1rem;">
                <label for="account-details">Account Details</label>
                <input type="text" id="account-details" class="a-search" placeholder="e.g., Number: 01xxxxxxxxx" required>
            </div>
            <div class="a-modal-footer">
                <button type="button" class="btn btn-outline" id="modal-cancel-btn">Cancel</button>
                <button type="submit" class="btn btn-dark">Save Method</button>
            </div>
        </form>
    `;
    showAdminModal();

    // Attach event listeners for the new modal content
    document.getElementById('modal-cancel-btn').addEventListener('click', hideAdminModal);
    document.getElementById('payment-method-form').addEventListener('submit', handleFormSubmit);
};

// This function is called when the modal form is submitted
const handleFormSubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('method-name').value.trim();
    const accountDetails = document.getElementById('account-details').value.trim();

    if (!name || !accountDetails) {
        alert("Please fill out all fields.");
        return;
    }

    const newMethod = {
        id: `pm_${Date.now()}`, // Simple unique ID
        name: name,
        accountDetails: accountDetails,
        isEnabled: true,
        // We will add instructions and proof fields in the next step
        instructions: ["Default instructions."],
        requiredProofFields: [
            { "label": "Amount Sent (৳)", "id": "amount", "type": "number" },
            { "label": "Transaction ID (TrxID)", "id": "transactionId", "type": "text" }
        ]
    };

    try {
        const settingsRef = doc(db, "settings", "paymentMethods");
        // Use arrayUnion to add the new method to the existing array
        await updateDoc(settingsRef, {
            methods: arrayUnion(newMethod)
        });
        
        hideAdminModal();
        loadPaymentMethods(); // Refresh the list
    } catch (error) {
        console.error("Error adding new payment method:", error);
        alert("Could not save the new method. Please check the console.");
    }
};



// Wait for the admin guard to confirm the user is an admin
document.addEventListener('adminReady', () => {
    loadPaymentMethods();
    // Activate the "Add New Method" button
    addMethodBtn.addEventListener('click', handleAddMethod);
});