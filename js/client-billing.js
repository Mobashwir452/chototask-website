import { auth, db } from '/js/firebase-config.js';
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
import { doc, onSnapshot, getDoc, collection, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {
    
    const functions = getFunctions();
    const requestDeposit = httpsCallable(functions, 'requestDeposit');

    // --- DOM Elements ---
    const currentBalanceEl = document.getElementById('current-balance');
    const headerBalance = document.getElementById('header-balance');
    const tabsContainer = document.getElementById('payment-methods-tabs');
    const contentContainer = document.getElementById('payment-method-content');
    const historyListContainer = document.getElementById('transaction-history-list');

    // Info Modal Elements
    const infoModal = document.getElementById('info-modal');
    const infoModalTitle = document.getElementById('info-modal-title');
    const infoModalMessage = document.getElementById('info-modal-message');
    const infoModalCloseBtn = document.getElementById('info-modal-close-btn');

    let currentUserId = null;
    let availableMethods = [];
    
// --- MODAL & UI FUNCTIONS ---
    const showInfoModal = (title, message) => {
        infoModalTitle.textContent = title;
        infoModalMessage.textContent = message;
        infoModal.style.display = 'flex';
    };
    infoModalCloseBtn.addEventListener('click', () => infoModal.style.display = 'none');



// FILE: /js/client-billing.js (Replace this function)

const renderSelectedMethod = (methodId) => {
    const method = availableMethods.find(m => m.id === methodId);
    if (!method) {
        contentContainer.innerHTML = `<p class="a-empty">Please select a payment method.</p>`;
        return;
    }

    const instructionsHTML = method.instructions.map((step, index) => `
        <div class="step-item">
            <div class="step-number">${index + 1}</div>
            <p>${step}</p>
        </div>`).join('');

    const fieldsHTML = method.requiredProofFields.map(field => `
        <div class="form-group">
            <label for="${field.id}">${field.label}</label>
            <input type="${field.type}" id="${field.id}" required>
        </div>`).join('');

    contentContainer.innerHTML = `
        <div class="instruction-steps">${instructionsHTML}</div>
        <div class="payment-number-display">
            <span>Pay to ${method.name}</span>
            <strong>${method.accountDetails}</strong>
        </div>
        <form id="add-funds-form">
            ${fieldsHTML}
            <button type="submit" class="btn-submit">
                <span class="btn-text">Submit Deposit Request</span>
            </button>
            <p id="form-message"></p>
        </form>
    `;
    
    document.getElementById('add-funds-form').addEventListener('submit', handleFormSubmit);
};

    const renderMethodTabs = () => {
        if (availableMethods.length === 0) {
            tabsContainer.innerHTML = `<p class="a-empty">No payment methods are currently available.</p>`;
            return;
        }
        tabsContainer.innerHTML = availableMethods.map((method, index) => `
            <button class="payment-method-tab ${index === 0 ? 'active' : ''}" data-id="${method.id}">
                ${method.name}
            </button>
        `).join('');
        // Initially render the first method's content
        renderSelectedMethod(availableMethods[0].id);
    };

    // --- DATA & EVENT HANDLING ---
    const loadPaymentMethods = async () => {
        try {
            const settingsRef = doc(db, "settings", "paymentMethods");
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists() && docSnap.data().methods) {
                // Filter for methods that are enabled
                availableMethods = docSnap.data().methods.filter(m => m.isEnabled);
                renderMethodTabs();
            } else {
                renderMethodTabs(); // Will show the "not available" message
            }
        } catch (error) {
            console.error("Error fetching payment methods:", error);
            tabsContainer.innerHTML = `<p class="a-empty">Could not load payment methods.</p>`;
        }
    };
    
// FILE: /js/client-billing.js (Replace this function)


const handleFormSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('.btn-submit');
        const formMessage = form.querySelector('#form-message');

        // Check if a user is logged in
        if (!auth.currentUser) {
            showMessage("You must be logged in to submit a request.", true);
            return;
        }

        // ... (the logic to get method and proofData is the same) ...
        const activeTab = tabsContainer.querySelector('.active');
        const method = availableMethods.find(m => m.id === activeTab.dataset.id);
        const proofData = {};
        method.requiredProofFields.forEach(field => {
            const input = form.querySelector(`#${field.id}`);
            proofData[field.id] = input.value;
        });

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner" style="..."></span>`;

        try {
            // 1. Get the user's ID Token
            const token = await auth.currentUser.getIdToken();

            // 2. Call the Netlify Function using fetch
            const response = await fetch('/.netlify/functions/requestDeposit', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    methodName: method.name,
                    proofData: proofData
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Failed to submit request.");
            }

            form.reset();
            showInfoModal("Request Submitted!", "Your balance has been provisionally updated.");

        } catch (error) {
            console.error("Error submitting deposit request:", error);
            formMessage.textContent = `Error: ${error.message}`;
            formMessage.className = 'message-error';
        }

        // Restore button state
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span class="btn-text">Submit Deposit Request</span>`;
    };

    // --- Wallet and Auth Logic ---
    const listenToWallet = (userId) => {
        const walletRef = doc(db, "wallets", userId);
        onSnapshot(walletRef, (doc) => {
            const balance = doc.exists() ? (doc.data().balance ?? 0) : 0;
            const formattedBalance = `৳${balance.toLocaleString()}`;
            if (currentBalanceEl) currentBalanceEl.textContent = formattedBalance;
            if (headerBalance) headerBalance.textContent = formattedBalance;
        });
    };


onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            listenToWallet(currentUserId);
            loadPaymentMethods();
            // The history will be connected to live data in the next step
        } else {
            window.location.href = '/login.html';
        }
    });

});