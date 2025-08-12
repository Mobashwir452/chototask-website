// FILE: /js/client-billing.js (REVISED WITH TRANSACTION CARDS)

import { auth, db } from '/js/firebase-config.js';
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {
    
    const functions = getFunctions();
    const requestDeposit = httpsCallable(functions, 'requestDeposit');

    // --- DOM Elements ---
    const addFundsForm = document.getElementById('add-funds-form');
    // ... (other form elements are correct)
    const currentBalanceEl = document.getElementById('current-balance');
    const historyListContainer = document.getElementById('transaction-history-list');
    const headerBalance = document.getElementById('header-balance');
    let currentUserId = null;

    // --- RENDER HISTORY FUNCTION ---
    const renderHistory = (transactions) => {
        if (!historyListContainer) return;
        if (transactions.length === 0) {
            historyListContainer.innerHTML = `<p class="empty-state">No recent transactions found.</p>`;
            return;
        }

        historyListContainer.innerHTML = transactions.map(tx => {
            const amountSign = tx.amount > 0 ? '+' : '';
            const amountColor = tx.amount > 0 ? 'credit' : 'debit';
            const iconType = tx.amount > 0 ? 'credit' : 'debit';
            const icon = tx.amount > 0 ? 'fa-arrow-down' : 'fa-arrow-up';
            if (tx.type === 'deposit_adjusted') iconType = 'info';

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

    // --- Wallet and Auth Logic (mostly unchanged) ---
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