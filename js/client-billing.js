import { auth, db } from '/js/firebase-config.js';
import { doc, onSnapshot, getDoc, collection, addDoc, serverTimestamp, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {
    
    // --- DOM Elements ---
    const currentBalanceEl = document.getElementById('current-balance');
    const headerBalance = document.getElementById('header-balance');
    const addFundsForm = document.getElementById('add-funds-form'); // Ensure this is correctly scoped if it's dynamic
    const tabsContainer = document.getElementById('payment-methods-tabs');
    const contentContainer = document.getElementById('payment-method-content');
    const historyListContainer = document.getElementById('transaction-history-list');
    const infoModal = document.getElementById('info-modal');
    const infoModalTitle = document.getElementById('info-modal-title');
    const infoModalMessage = document.getElementById('info-modal-message');
    const infoModalCloseBtn = document.getElementById('info-modal-close-btn');

    let currentUserId = null;
    let availableMethods = [];


// --- RENDER HISTORY FUNCTION ---
    const renderHistory = (transactions) => {
        if (!historyListContainer) return;
        if (transactions.length === 0) {
            historyListContainer.innerHTML = `<p class="empty-state" style="text-align: center; padding: 1rem;">No transactions found.</p>`;
            return;
        }
        historyListContainer.innerHTML = transactions.map(tx => {
        const isCredit = tx.amount > 0;
        const amountSign = isCredit ? '+' : '-';
        const amountColor = isCredit ? 'credit' : 'debit';
        // Determine icon based on transaction type
        const iconType = tx.type === 'deposit_adjusted' ? 'info' : (isCredit ? 'credit' : 'debit');
        const icon = isCredit ? 'fa-arrow-down' : 'fa-arrow-up';

        return `
            <a href="/client/transactions/${tx.id}" class="transaction-item-link">
                <div class="transaction-card">
                    <div class="transaction-card__icon transaction-card__icon--${iconType}">
                        <i class="fa-solid ${icon}"></i>
                    </div>
                    <div class="transaction-card__details">
                        <p class="transaction-card__description">${tx.description}</p>
                        <p class="transaction-card__date">${tx.date}</p>
                    </div>
                    <div class="transaction-card__amount transaction-card__amount--${amountColor}">
                        ${amountSign} ৳${Math.abs(tx.amount).toLocaleString()}
                    </div>
                </div>
            </a>
        `;
    }).join('');
};


// --- NEW: FUNCTION TO LISTEN FOR LIVE TRANSACTIONS ---
    const listenToHistory = (userId) => {
        const q = query(
            collection(db, "transactions"), 
            where("clientId", "==", userId), 
            orderBy("createdAt", "desc"),
            limit(10)
        );

        // onSnapshot creates a real-time listener
        onSnapshot(q, (snapshot) => {
            const transactions = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                transactions.push({
                    id: doc.id,
                    amount: data.amount,
                    type: data.type,
                    description: data.description || `${data.methodName} Deposit`,
                    date: data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'N/A'
                });
            });
            renderHistory(transactions); // Render the live data
        }, (error) => {
            console.error("Error fetching transaction history: ", error);
            historyListContainer.innerHTML = `<p class="empty-state" style="text-align: center; padding: 1rem;">Could not load transactions.</p>`;
        });
    };


    
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

            // FIX: Replaced the dummy data with the live listener function
            listenToHistory(currentUserId);
            
            // Re-attach listener to the form, as it's created dynamically
            // Note: This assumes your form is created by another function like 'renderSelectedMethod'
            const form = document.getElementById('add-funds-form');
            if(form) {
                form.addEventListener('submit', handleFormSubmit);
            }

        } else {
            window.location.href = '/login.html';
        }
    });
});