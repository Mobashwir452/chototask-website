// FILE: /worker/js/worker-transactions.js

import { auth, db } from '/js/firebase-config.js';
import { collection, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {

    const listContainer = document.getElementById('transaction-list-container');
    const filterButtons = document.querySelectorAll('.filter-btn');

    let currentUserId = null;
    let transactionsUnsubscribe = null;

    const renderTransactions = (transactions) => {
        if (!listContainer) return;
        if (transactions.length === 0) {
            listContainer.innerHTML = `<p class="empty-state">No transactions found for this filter.</p>`;
            return;
        }

        listContainer.innerHTML = transactions.map(tx => {
            const isCredit = tx.amount > 0;
            const amountSign = isCredit ? '+' : '-';
            const amountColor = isCredit ? 'credit' : 'debit';
            
            let iconClass = 'info';
            let iconSymbol = 'fa-info-circle';

            // ✅ UPDATED: Icon logic for worker transaction types
            switch (tx.type) {
                case 'job_payout':
                    iconClass = 'credit';
                    iconSymbol = 'fa-sack-dollar';
                    break;
                case 'withdrawal':
                    iconClass = 'debit';
                    iconSymbol = 'fa-arrow-up-from-bracket';
                    break;
                case 'bonus':
                case 'adjustment':
                    iconClass = 'info';
                    iconSymbol = 'fa-gift';
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
    
    // এই নতুন ফাংশনটি দিয়ে আপনার পুরনো fetchTransactions ফাংশনটি প্রতিস্থাপন করুন

// এই নতুন ফাংশনটি দিয়ে আপনার পুরনো fetchTransactions ফাংশনটি প্রতিস্থাপন করুন

const fetchTransactions = (filterType = 'all') => {
    if (!currentUserId) return;
    if (transactionsUnsubscribe) {
        transactionsUnsubscribe();
    }

    let q = query(
        collection(db, "transactions"), 
        where("userId", "==", currentUserId), 
        orderBy("createdAt", "desc")
    );
    
    if (filterType !== 'all') {
        q = query(q, where("type", "==", filterType));

        // ✅ নতুন কোড: যদি ফিল্টারের ধরন 'withdrawal' হয়, 
        // তাহলে শুধু 'approved' স্ট্যাটাসের গুলোই দেখাও
        if (filterType === 'withdrawal') {
            q = query(q, where("status", "==", "approved"));
        }
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
        listContainer.innerHTML = `<p class="empty-state">Could not load transactions. Please try again.</p>`;
    });
};

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const filterType = button.dataset.filter;
            fetchTransactions(filterType);
        });
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            fetchTransactions();
        } else {
            window.location.href = '/login.html';
        }
    });
});