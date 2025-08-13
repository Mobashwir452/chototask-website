// FILE: /js/admin-settings.js (FINAL ADVANCED VERSION)

import { db } from '/js/firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- DOM ELEMENTS ---
const listContainer = document.getElementById('payment-methods-list');
const addMethodBtn = document.getElementById('add-method-btn');
const adminModal = document.getElementById('admin-modal');
const modalTitle = document.getElementById('admin-modal-title');
const modalBody = document.getElementById('admin-modal-body');
const modalCloseBtn = document.getElementById('admin-modal-close-btn');

let allMethods = []; // Local cache of payment methods

// --- MODAL CONTROLS ---
const showAdminModal = () => adminModal.style.display = 'flex';
const hideAdminModal = () => adminModal.style.display = 'none';

if (modalCloseBtn) modalCloseBtn.addEventListener('click', hideAdminModal);
adminModal.addEventListener('click', (e) => {
    if (e.target === adminModal) hideAdminModal();
});

const showSuccessMessage = (message) => {
    modalTitle.textContent = 'Success!';
    modalBody.innerHTML = `<p style="text-align: center; padding: 1rem 0;">${message}</p>
        <div class="a-modal-footer">
            <button type="button" class="btn btn-dark" id="success-ok-btn">OK</button>
        </div>
    `;
    showAdminModal();
    document.getElementById('success-ok-btn').addEventListener('click', hideAdminModal);
};

// --- RENDER FUNCTION ---
const renderMethods = (methods = []) => {
    allMethods = methods; // Update local cache
    if (!listContainer) return;
    if (methods.length === 0) {
        listContainer.innerHTML = `<p class="a-empty">No payment methods configured.</p>`;
        return;
    }
    listContainer.innerHTML = methods.map(method => {
        const isEnabled = method.isEnabled !== false; // Default to enabled
        const statusIcon = isEnabled ? 'fa-pause' : 'fa-play';
        const statusTitle = isEnabled ? 'Pause' : 'Enable';
        const statusClass = isEnabled ? '' : 'paused';
        return `
        <div class="payment-method-item" data-id="${method.id}">
            <div class="payment-method-info">
                <strong>${method.name} ${!isEnabled ? '(Paused)' : ''}</strong>
                <span>${method.accountDetails || ''}</span>
            </div>
            <div class="a-actions">
                <button class="a-action-btn toggle-status ${statusClass}" data-action="toggle" data-id="${method.id}" title="${statusTitle}"><i class="fa-solid ${statusIcon}"></i></button>
                <button class="a-action-btn edit" data-action="edit" data-id="${method.id}" title="Edit Method"><i class="fa-solid fa-pencil"></i></button>
                <button class="a-action-btn delete" data-action="delete" data-id="${method.id}" title="Delete Method"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        </div>
    `}).join('');
};
// --- DYNAMIC FORM LOGIC ---
const addInstructionInput = (value = '') => {
    const container = document.getElementById('instructions-container');
    const div = document.createElement('div');
    div.className = 'dynamic-list-item';
    div.innerHTML = `<input type="text" class="a-search instruction-input" value="${value}" placeholder="Enter an instruction step" required><button type="button" class="btn-remove-item" title="Remove">&times;</button>`;
    container.appendChild(div);
};

const addProofFieldInputs = (field = { label: '', id: '', type: 'text' }) => {
    const container = document.getElementById('proof-fields-container');
    const div = document.createElement('div');
    div.className = 'dynamic-list-item';
    div.innerHTML = `
        <div class="proof-field-group">
            <input type="text" class="a-search proof-label" value="${field.label}" placeholder="Field Label (e.g., Amount Sent)" required>
            <input type="text" class="a-search proof-id" value="${field.id}" placeholder="Field ID (e.g., amount)" required>
            <select class="a-search proof-type">
                <option value="text" ${field.type === 'text' ? 'selected' : ''}>Text</option>
                <option value="number" ${field.type === 'number' ? 'selected' : ''}>Number</option>
            </select>
        </div>
        <button type="button" class="btn-remove-item" title="Remove">&times;</button>`;
    container.appendChild(div);
};



// --- FORM & ACTION HANDLERS ---
const openMethodForm = (method = null) => {
    const isEditing = method !== null;
    modalTitle.textContent = isEditing ? "Edit Payment Method" : "Add New Payment Method";
    modalBody.innerHTML = `
        <form id="payment-method-form" data-id="${isEditing ? method.id : ''}">
            <div class="form-group"><label>Method Name</label><input type="text" id="method-name" class="a-search" required value="${isEditing ? method.name : ''}"></div>
            <div class="form-group" style="margin-top:1rem;"><label>Account Details</label><input type="text" id="account-details" class="a-search" required value="${isEditing ? method.accountDetails : ''}"></div>
            <h4 class="form-section-header">Client Instructions</h4>
            <div class="dynamic-list-container" id="instructions-container"></div>
            <button type="button" class="btn-add-more" id="add-instruction-btn">+ Add Instruction</button>
            <h4 class="form-section-header">Required Proof Fields</h4>
            <div class="dynamic-list-container" id="proof-fields-container"></div>
            <button type="button" class="btn-add-more" id="add-proof-field-btn">+ Add Proof Field</button>
            <div class="a-modal-footer">
                <button type="button" class="btn btn-outline" id="modal-cancel-btn">Cancel</button>
                <button type="submit" class="btn btn-dark">Save Changes</button>
            </div>
        </form>`;
    showAdminModal();

    // Populate dynamic fields if editing
    if (isEditing) {
        method.instructions.forEach(inst => addInstructionInput(inst));
        method.requiredProofFields.forEach(field => addProofFieldInputs(field));
    } else {
        // Add defaults for a new method
        addInstructionInput("Use the 'Send Money' option.");
        addProofFieldInputs({ label: "Amount Sent (৳)", id: "amount", type: "number" });
        addProofFieldInputs({ label: "Transaction ID (TrxID)", id: "transactionId", type: "text" });
    }

    // Attach event listeners
    document.getElementById('modal-cancel-btn').addEventListener('click', hideAdminModal);
    document.getElementById('add-instruction-btn').addEventListener('click', () => addInstructionInput());
    document.getElementById('add-proof-field-btn').addEventListener('click', () => addProofFieldInputs());
    document.getElementById('payment-method-form').addEventListener('submit', handleFormSubmit);
    modalBody.addEventListener('click', e => {
        if (e.target.closest('.btn-remove-item')) e.target.closest('.dynamic-list-item').remove();
    });
};



const handleFormSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const methodId = form.dataset.id;
    const isEditing = !!methodId;

    const updatedMethodData = {
        name: form.querySelector('#method-name').value.trim(),
        accountDetails: form.querySelector('#account-details').value.trim(),
        instructions: [...form.querySelectorAll('.instruction-input')].map(i => i.value.trim()).filter(Boolean),
        requiredProofFields: [...form.querySelectorAll('#proof-fields-container .dynamic-list-item')].map(item => ({
            label: item.querySelector('.proof-label').value.trim(),
            id: item.querySelector('.proof-id').value.trim(),
            type: item.querySelector('.proof-type').value
        })).filter(f => f.label && f.id)
    };
    if (!updatedMethodData.name || !updatedMethodData.accountDetails) return alert("Please fill out all required fields.");

    try {
        const settingsRef = doc(db, "settings", "paymentMethods");
        if (isEditing) {
            const updatedMethods = allMethods.map(m => m.id === methodId ? { ...m, ...updatedMethodData } : m);
            await updateDoc(settingsRef, { methods: updatedMethods });
        } else {
            const newMethod = { ...updatedMethodData, id: `pm_${Date.now()}`, isEnabled: true };
            await setDoc(settingsRef, { methods: arrayUnion(newMethod) }, { merge: true });
        }
        showSuccessMessage(`Payment method was ${isEditing ? 'updated' : 'added'} successfully.`);
        loadPaymentMethods();
    } catch (error) {
        console.error("Error saving payment method:", error);
        alert("Could not save the method. Please check the console.");
    }
};


// --- DATA FETCHING ---
const loadPaymentMethods = async () => {
    try {
        const settingsRef = doc(db, "settings", "paymentMethods");
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists() && docSnap.data().methods) {
            renderMethods(docSnap.data().methods);
        } else {
            renderMethods([]);
        }
    } catch (error) {
        console.error("Error fetching payment methods:", error);
        listContainer.innerHTML = `<p class="a-empty">Error loading data. Please check the console.</p>`;
    }
};


// FILE: /js/admin-settings.js (Replace this function)

const handleDelete = (methodId) => {
    const methodToDelete = allMethods.find(m => m.id === methodId);
    if (!methodToDelete) return;

    // 1. Build the custom confirmation modal HTML
    modalTitle.textContent = 'Delete Payment Method';
    modalBody.innerHTML = `
        <p>Are you sure you want to permanently delete the method "<strong>${methodToDelete.name}</strong>"?</p>
        <p>This action cannot be undone.</p>
        <div class="a-modal-footer">
            <button type="button" class="btn btn-outline" id="delete-cancel-btn">Cancel</button>
            <button type="button" class="btn btn-danger" id="delete-confirm-btn">Yes, Delete</button>
        </div>
    `;

    // 2. Show the modal
    showAdminModal();

    // 3. Add event listeners to the new buttons inside the modal
    const confirmBtn = document.getElementById('delete-confirm-btn');
    const cancelBtn = document.getElementById('delete-cancel-btn');

    cancelBtn.addEventListener('click', hideAdminModal);

    confirmBtn.addEventListener('click', async () => {
        try {
            const settingsRef = doc(db, "settings", "paymentMethods");
            await updateDoc(settingsRef, { methods: arrayRemove(methodToDelete) });
            
            showSuccessMessage("Payment method deleted successfully.");
            loadPaymentMethods(); // Refresh the list
        } catch (error) {
            console.error("Error deleting method:", error);
            alert("Could not delete the method. Please check the console.");
            hideAdminModal();
        }
    });
};


const handleToggleStatus = async (methodId) => {
    const updatedMethods = allMethods.map(m => {
        if (m.id === methodId) {
            return { ...m, isEnabled: m.isEnabled === false ? true : false };
        }
        return m;
    });

    try {
        const settingsRef = doc(db, "settings", "paymentMethods");
        await updateDoc(settingsRef, { methods: updatedMethods });
        loadPaymentMethods(); // Just refresh the list, no success message needed for a simple toggle
    } catch (error) {
        console.error("Error toggling status:", error);
        alert("Could not update the status. Check console.");
    }
};



// --- INITIALIZATION ---
document.addEventListener('adminReady', () => {
    loadPaymentMethods();
    addMethodBtn.addEventListener('click', () => openMethodForm(null)); // Pass null for "add" mode

    // Delegated event listener for all actions on the list
    listContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.a-action-btn');
        if (!button) return;
        
        const { action, id } = button.dataset;
        const method = allMethods.find(m => m.id === id);

        if (action === 'edit') openMethodForm(method);
        if (action === 'delete') handleDelete(id);
        if (action === 'toggle') handleToggleStatus(id);
    });
});