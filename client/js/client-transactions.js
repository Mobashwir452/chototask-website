// FILE: /js/client-transactions.js

import { auth, db } from '/js/firebase-config.js';
import { collection, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {

    const listContainer = document.getElementById('transaction-list-container');
    const filterButtons = document.querySelectorAll('.filter-btn');

    let currentUserId = null;
    let transactionsUnsubscribe = null; // To store the listener unsubscribe function

    const renderTransactions = (transactions) => {
        if (!listContainer) return;
        if (transactions.length === 0) {
            listContainer.innerHTML = `<p class="empty-state" style="text-align: center; padding: 1rem;">No transactions found for this filter.</p>`;
            return;
        }

        listContainer.innerHTML = transactions.map(tx => {
            const isCredit = tx.amount > 0;
            const amountSign = isCredit ? '+' : '';
            const amountColor = isCredit ? 'credit' : 'debit';
            
            let iconClass = 'info';
            let iconSymbol = 'fa-info-circle';

            switch (tx.type) {
                case 'deposit':
                    iconClass = 'credit';
                    iconSymbol = 'fa-arrow-down';
                    break;
                case 'job_posting':
                    iconClass = 'debit';
                    iconSymbol = 'fa-arrow-up';
                    break;
                case 'deposit_adjustment':
                    iconClass = 'info';
                    iconSymbol = 'fa-pen-to-square';
                    break;
            }

            return `
                <div class="transaction-item-link">
                    <div class="transaction-card">
                        <div class="transaction-card__icon transaction-card__icon--${iconClass}"><i class="fa-solid ${iconSymbol}"></i></div>
                        <div class="transaction-card__details">
                            <p class="transaction-card__description">${tx.description}</p>
                            <p class="transaction-card__date">${tx.date}</p>
                        </div>
                        <div class="transaction-card__amount transaction-card__amount--${amountColor}">${amountSign} ৳${Math.abs(tx.amount).toLocaleString()}</div>
                    </div>
                </div>
            `;
        }).join('');
    };
    
    const fetchTransactions = (filterType = 'all') => {
        if (!currentUserId) return;

        // Unsubscribe from the previous listener before creating a new one
        if (transactionsUnsubscribe) {
            transactionsUnsubscribe();
        }

        let q = query(
            collection(db, "transactions"), 
            where("clientId", "==", currentUserId), 
            orderBy("createdAt", "desc")
        );
        
        // Add the type filter if it's not 'all'
        if (filterType !== 'all') {
            q = query(q, where("type", "==", filterType));
        }

        transactionsUnsubscribe = onSnapshot(q, (snapshot) => {
            const transactions = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    amount: data.amount,
                    type: data.type,
                    description: data.description,
                    date: data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'N/A'
                };
            });
            renderTransactions(transactions);
        }, (error) => {
            console.error("Error fetching transactions: ", error);
            listContainer.innerHTML = `<p class="empty-state" style="text-align: center; padding: 1rem;">Could not load transactions.</p>`;
        });
    };

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active class on buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Fetch data with the new filter
            const filterType = button.dataset.filter;
            fetchTransactions(filterType);
        });
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            fetchTransactions(); // Fetch initial data with 'all' filter
        } else {
            window.location.href = '/login.html';
        }
    });
});