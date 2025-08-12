import { auth, db } from '/js/firebase-config.js';
import { doc, onSnapshot, getDoc, collection, addDoc, serverTimestamp, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {
    
    // --- DOM Elements ---
    const currentBalanceEl = document.getElementById('current-balance');
    const headerBalance = document.getElementById('header-balance');
    const tabsContainer = document.getElementById('payment-methods-tabs');
    const contentContainer = document.getElementById('payment-method-content');
    const historyListContainer = document.getElementById('transaction-history-list');
    const infoModal = document.getElementById('info-modal');
    const infoModalTitle = document.getElementById('info-modal-title');
    const infoModalMessage = document.getElementById('info-modal-message');
    const infoModalCloseBtn = document.getElementById('info-modal-close-btn');

    let currentUserId = null;
    let availableMethods = [];
    
// --- MODAL & UI FUNCTIONS ---
    const showInfoModal = (title, message) => {
        if (!infoModal) return;
        infoModalTitle.textContent = title;
        infoModalMessage.textContent = message;
        infoModal.style.display = 'flex';
    };
    if (infoModalCloseBtn) {
        infoModalCloseBtn.addEventListener('click', () => infoModal.style.display = 'none');
    }

  const showMessage = (form, message, isError = false) => {
        const formMessage = form.querySelector('#form-message');
        if (!formMessage) return;
        formMessage.textContent = message;
        formMessage.className = isError ? 'message-error' : 'message-success';
    };

// FILE: /js/client-billing.js (Replace this function)

 // --- RENDER FUNCTIONS ---
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
                <input type="${field.type}" id="${field.id}" placeholder="${field.label}" required>
            </div>`).join('');

        contentContainer.innerHTML = `
            <div class="instruction-steps">${instructionsHTML}</div>
            <div class="payment-number-display">
                <span>Pay to ${method.name}</span>
                <strong>${method.accountDetails}</strong>
            </div>
            <form id="add-funds-form">
                ${fieldsHTML}
                <button type="submit" class="btn-submit"><span class="btn-text">Submit Deposit Request</span></button>
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
        const originalBtnText = submitBtn.innerHTML;

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner" style="border-color: #2C3E50; border-right-color: transparent; width: 1.2em; height: 1.2em; display: inline-block;"></span>`;
        
        try {
            const activeTab = tabsContainer.querySelector('.active');
            const method = availableMethods.find(m => m.id === activeTab.dataset.id);
            const proofData = {};
            method.requiredProofFields.forEach(field => {
                const input = form.querySelector(`#${field.id}`);
                proofData[field.id] = input.value;
            });

            await addDoc(collection(db, "depositRequests"), {
                clientId: currentUserId,
                clientEmail: auth.currentUser.email,
                amount: Number(proofData.amount),
                transactionId: proofData.transactionId,
                methodName: method.name,
                status: "pending",
                requestedAt: serverTimestamp()
            });

            showInfoModal("Request Submitted", "Your deposit request has been sent for admin approval.");
            form.reset();

        } catch (error) {
            console.error("Error submitting deposit request:", error);
            showMessage(form, "An error occurred. Please try again.", true);
        }

        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    };

    // FIX: This event listener handles the tab switching.
    tabsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('payment-method-tab')) {
            // Remove active class from the previous tab
            tabsContainer.querySelector('.active')?.classList.remove('active');
            // Add active class to the clicked tab
            e.target.classList.add('active');
            // Render the content for the selected method
            renderSelectedMethod(e.target.dataset.id);
        }
    });

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
            // renderHistory(dummyTransactions); // We can connect this to live data later
        } else {
            window.location.href = '/login.html';
        }
    });
});