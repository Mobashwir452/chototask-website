// FILE: /worker/js/worker-withdraw.js (FINAL & COMPLETE)

import { auth, db } from '/js/firebase-config.js';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {
    
    // --- DOM Elements ---
    const withdrawSection = document.getElementById('withdraw-section');
    const historyListContainer = document.getElementById('transaction-history-list');
    const infoModal = document.getElementById('info-modal');
    const infoModalTitle = document.getElementById('info-modal-title');
    const infoModalMessage = document.getElementById('info-modal-message');
    const infoModalCloseBtn = document.getElementById('info-modal-close-btn');

    let currentUser = null;
    let countdownIntervals = [];

    // --- MODAL & UI FUNCTIONS ---
    const showInfoModal = (title, message) => {
        if (!infoModal || !infoModalTitle || !infoModalMessage) return;
        infoModalTitle.textContent = title;
        infoModalMessage.innerHTML = message;
        infoModal.style.display = 'flex';
    };

    if (infoModalCloseBtn) {
        infoModalCloseBtn.addEventListener('click', () => {
            if (infoModal) infoModal.style.display = 'none';
        });
    }

    const showMessageInForm = (form, message, isError = false) => {
        const formMessageEl = form.querySelector('#form-message');
        if (!formMessageEl) return;
        formMessageEl.textContent = message;
        formMessageEl.style.color = isError ? '#EB5757' : '#00FFCD';
    };

    // --- RENDER FUNCTIONS ---
    const renderWithdrawSection = (user) => {
        const methods = user.withdrawalMethods || [];
        if (methods.length === 0) {
            withdrawSection.innerHTML = `
                <div class="no-methods-box">
                    <p>You have no withdrawal methods saved.</p>
                    <a href="/worker/personal-info.html" class="btn-submit">Add a Method Now</a>
                </div>`;
            return;
        }

        const methodsHTML = methods.map(m => `
            <div class="method-card" data-method-id="${m.id}">
                <i class="icon fa-solid fa-wallet"></i>
                <div class="details">
                    <p class="method-name">${m.methodName}</p>
                    <p class="method-details">${m.accountDetails}</p>
                </div>
            </div>`).join('');

        withdrawSection.innerHTML = `
            <form class="withdraw-form" id="withdraw-form">
                <div>
                    <h3 class="instruction-header">1. Select a Method</h3>
                    <div class="saved-methods-container">${methodsHTML}</div>
                </div>
                <div>
                    <h3 class="instruction-header">2. Enter Amount</h3>
                    <div class="amount-input-group">
                        <input type="number" id="withdraw-amount" class="form-input" placeholder="Amount (e.g., 50)" min="50" required>
                        <button type="submit" class="btn-submit">Request Withdrawal</button>
                    </div>
                </div>
                <p id="form-message" style="text-align: center; min-height: 1.2em;"></p>
            </form>`;

        const form = document.getElementById('withdraw-form');
        form.addEventListener('submit', handleWithdrawalRequest);
        form.querySelector('.saved-methods-container').addEventListener('click', e => {
            const card = e.target.closest('.method-card');
            if (card) {
                form.querySelectorAll('.method-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            }
        });
    };

    const renderHistory = (transactions) => {
        countdownIntervals.forEach(clearInterval);
        countdownIntervals = [];

        if (!historyListContainer) return;
        if (transactions.length === 0) {
            historyListContainer.innerHTML = `<p class="empty-list-message">No recent transactions found.</p>`;
            return;
        }

        historyListContainer.innerHTML = transactions.map(tx => {
            const isCredit = tx.amount > 0;
            const amountSign = isCredit ? '+' : '-';
            const amountColor = isCredit ? 'credit' : 'debit';
            const iconType = tx.type === 'earning' ? 'credit' : 'debit';
            const icon = isCredit ? 'fa-arrow-down' : 'fa-arrow-up';
            
            let timerHTML = '';
            if (tx.status === 'pending' && tx.type === 'withdrawal') {
                timerHTML = `<div class="review-timer" data-requested-at="${tx.createdAt.toMillis()}"></div>`;
            }

            return `
                <div class="transaction-card-wrapper">
                    <a href="#" class="transaction-item-link">
                        <div class="transaction-card">
                            <div class="transaction-card__icon transaction-card__icon--${iconType}"><i class="fa-solid ${icon}"></i></div>
                            <div class="transaction-card__details">
                                <p class="transaction-card__description">${tx.description}</p>
                                <p class="transaction-card__date">${tx.date}</p>
                            </div>
                            <div class="transaction-card__amount transaction-card__amount--${amountColor}">${amountSign} ৳${Math.abs(tx.amount).toLocaleString()}</div>
                        </div>
                    </a>
                    ${timerHTML}
                </div>`;
        }).join('');
        
        startCountdownTimers();
    };
    
    const startCountdownTimers = () => {
        const timerElements = document.querySelectorAll('.review-timer');
        const payoutDuration = 24 * 60 * 60 * 1000; // 24 hours

        timerElements.forEach(timerEl => {
            const requestedAt = parseInt(timerEl.dataset.requestedAt, 10);
            if (!requestedAt) return;

            const deadline = requestedAt + payoutDuration;

            const update = () => {
                const now = Date.now();
                const diff = deadline - now;

                if (diff <= 0) {
                    timerEl.innerHTML = `<strong>Payout processing overdue.</strong>`;
                    clearInterval(intervalId);
                    return;
                }
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                timerEl.innerHTML = `Admin will process in approx: <strong>${hours}h ${minutes}m</strong>`;
            };
            
            const intervalId = setInterval(update, 60000); // Update every minute
            countdownIntervals.push(intervalId);
            update(); // Run once immediately
        });
    };

    // --- DATA & EVENT HANDLING ---
    const handleWithdrawalRequest = async (e) => {
        e.preventDefault();
        const form = e.target;
        const selectedMethodCard = form.querySelector('.method-card.selected');
        const amount = form.querySelector('#withdraw-amount').value;
        const messageEl = form.querySelector('#form-message');

        if (!selectedMethodCard) {
            showMessageInForm(form, 'Please select a withdrawal method.', true);
            return;
        }
        
        const submitBtn = form.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        try {
            const token = await currentUser.getIdToken();
            const response = await fetch('/.netlify/functions/requestWithdrawal', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, methodId: selectedMethodCard.dataset.methodId })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            
            showInfoModal('Success!', 'Your withdrawal request has been submitted and is now pending admin approval.');
            withdrawSection.innerHTML = `<div class="no-methods-box"><p style="font-size:1.2rem; color: #00FFCD;">Request Sent!</p><p>You will be notified once the admin processes your request.</p></div>`;

        } catch (error) {
            showMessageInForm(form, error.message, true);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Request Withdrawal';
        }
    };

    const listenToHistory = (userId) => {
        const q = query(
            collection(db, "transactions"), 
            where("userId", "==", userId), 
            orderBy("createdAt", "desc"),
            limit(5)
        );
        onSnapshot(q, (snapshot) => {
            const transactions = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    amount: data.amount,
                    type: data.type,
                    status: data.status,
                    description: data.description,
                    createdAt: data.createdAt,
                    date: data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'N/A'
                };
            });
            renderHistory(transactions);
        }, (error) => {
            console.error("Error fetching transaction history: ", error);
            historyListContainer.innerHTML = `<p class="empty-list-message">Could not load transactions.</p>`;
        });
    };

    // --- INITIALIZATION ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                renderWithdrawSection(userDoc.data());
            } else {
                withdrawSection.innerHTML = `<p class="empty-list-message">Could not load your profile.</p>`;
            }
            listenToHistory(user.uid);
        } else {
            window.location.href = '/login.html';
        }
    });
});