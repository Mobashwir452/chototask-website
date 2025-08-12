// FILE: /js/client-billing.js (REVISED WITH TRANSACTION CARDS)

import { auth, db } from '/js/firebase-config.js';
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
import { doc, onSnapshot, collection, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {
    
    const functions = getFunctions();
    const requestDeposit = httpsCallable(functions, 'requestDeposit');

    // --- DOM Elements ---
  const addFundsToggleBtn = document.getElementById('add-funds-toggle-btn');
    const addFundsContainer = document.getElementById('add-funds-container');
    const addFundsForm = document.getElementById('add-funds-form');
    const amountInput = document.getElementById('amount');
    const trxIdInput = document.getElementById('transaction-id');
    const submitBtn = addFundsForm.querySelector('.btn-submit');
    const formMessage = document.getElementById('form-message');
    const currentBalanceEl = document.getElementById('current-balance');
    const historyListContainer = document.getElementById('transaction-history-list');
    const headerBalance = document.getElementById('header-balance');
    let currentUserId = null;


     // --- UI Logic for the toggleable form ---
    if (addFundsToggleBtn) {
        addFundsToggleBtn.addEventListener('click', () => {
            addFundsContainer.classList.toggle('hidden');
        });
    }

     const showMessage = (message, isError = false) => {
        formMessage.textContent = message;
        formMessage.className = isError ? 'message-error' : 'message-success';
    };

// FILE: /js/client-billing.js (REVISED FUNCTION)

// --- RENDER HISTORY FUNCTION ---
const renderHistory = (transactions) => {
    if (!historyListContainer) return;
    if (transactions.length === 0) {
        historyListContainer.innerHTML = `<p class="empty-state" style="text-align: center; padding: 1rem;">No recent transactions found.</p>`;
        return;
    }

    historyListContainer.innerHTML = transactions.map(tx => {
        const isCredit = tx.amount > 0;
        const amountSign = isCredit ? '+' : '-';
        const amountColor = isCredit ? 'credit' : 'debit';
        const iconType = isCredit ? 'credit' : 'debit';
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

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const amount = parseFloat(amountInput.value);
        const transactionId = trxIdInput.value.trim();

        if (isNaN(amount) || amount <= 0 || !transactionId) {
            showMessage("Please enter a valid amount and transaction ID.", true);
            return;
        }

        btnText.style.display = 'none';
        spinner.style.display = 'inline-block';
        submitBtn.disabled = true;

        try {
            const result = await requestDeposit({ amount, transactionId });
            if (result.data.success) {
                showMessage("Deposit request submitted successfully! Your balance has been provisionally updated.");
                addFundsForm.reset();
            } else {
                throw new Error(result.data.error || "An unknown error occurred.");
            }
        } catch (error) {
            console.error("Error calling requestDeposit function:", error);
            showMessage(`Error: ${error.message}`, true);
        }

        btnText.style.display = 'inline-block';
        spinner.style.display = 'none';
        submitBtn.disabled = false;
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
            // addFundsForm.addEventListener('submit', handleFormSubmit); // Assuming form submit logic is still needed


            // FIX: Uncomment the line below to activate the form submission button
        addFundsForm.addEventListener('submit', handleFormSubmit);

            // --- FAKE TRANSACTION DATA ---
            const dummyTransactions = [
                { id: "txn_123", amount: 500, type: "deposit", description: "Funds Deposit (Bkash)", date: new Date().toLocaleDateString() },
                { id: "txn_456", amount: -250, type: "job_payment", description: "Payment for Job: 'Data Entry'", date: new Date(Date.now() - 86400000).toLocaleDateString() }, // 1 day ago
                { id: "txn_789", amount: 490, type: "deposit_adjusted", description: "Funds Deposit (Adjusted by Admin)", date: new Date(Date.now() - 172800000).toLocaleDateString() } // 2 days ago
            ];

            renderHistory(dummyTransactions);

        } else {
            window.location.href = '/login.html';
        }
    });

});