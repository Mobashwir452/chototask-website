import { auth, db } from '/js/firebase-config.js';
import { doc, onSnapshot, getDoc, collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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
    const dynamicPaymentSection = document.getElementById('dynamic-payment-section');

    let currentUserId = null;
    let availableMethods = [];

    // --- MODAL & UI FUNCTIONS ---
    const showInfoModal = (title, message) => {
        if (!infoModal) return;
        infoModalTitle.textContent = title;
        infoModalMessage.innerHTML = message;
        infoModal.style.display = 'flex';
    };
    if (infoModalCloseBtn) {
        infoModalCloseBtn.addEventListener('click', () => infoModal.style.display = 'none');
    }
    const showMessageInForm = (form, message, isError = false) => {
        const formMessageEl = form.querySelector('#form-message');
        if (!formMessageEl) return;
        formMessageEl.textContent = message;
        formMessageEl.className = isError ? 'message-error' : 'message-success';
    };

    // --- RENDER FUNCTIONS ---
    const renderSelectedMethod = (methodId) => {
        const method = availableMethods.find(m => m.id === methodId);
        if (!method) {
            contentContainer.innerHTML = `<p class="a-empty">Please select a payment method.</p>`;
            return;
        }
        const fieldsHTML = method.requiredProofFields.map(field => {
            let extraAttributes = 'required';
            if (field.id === 'amount') {
                extraAttributes = `type="number" min="100" max="10000" required`;
            } else {
                extraAttributes = `type="${field.type}" required`;
            }
            return `<div class="form-group"><label for="${field.id}">${field.label}</label><input id="${field.id}" placeholder="${field.label}" ${extraAttributes}></div>`;
        }).join('');

        const instructionsHTML = method.instructions.map((step, index) => `<div class="step-item"><div class="step-number">${index + 1}</div><p>${step}</p></div>`).join('');
        
        contentContainer.innerHTML = `
            <div class="instruction-steps">${instructionsHTML}</div>
            <div class="payment-number-display"><span>Pay to ${method.name}</span><strong>${method.accountDetails}</strong></div>
            <form id="add-funds-form">${fieldsHTML}<button type="submit" class="btn-submit"><span class="btn-text">Submit Deposit Request</span></button><p id="form-message"></p></form>`;
        document.getElementById('add-funds-form').addEventListener('submit', handleFormSubmit);
    };

    const renderMethodTabs = () => {
        if (availableMethods.length === 0) {
            tabsContainer.innerHTML = `<p class="a-empty">No payment methods are currently available.</p>`;
            contentContainer.innerHTML = '';
            return;
        }
        tabsContainer.innerHTML = availableMethods.map((method, index) => `<button class="payment-method-tab ${index === 0 ? 'active' : ''}" data-id="${method.id}">${method.name}</button>`).join('');
        renderSelectedMethod(availableMethods[0].id);
    };

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
            const iconType = tx.type === 'deposit_adjusted' ? 'info' : (isCredit ? 'credit' : 'debit');
            const icon = isCredit ? 'fa-arrow-down' : 'fa-arrow-up';
            return `
                <a href="/client/transactions/${tx.id}" class="transaction-item-link">
                    <div class="transaction-card">
                        <div class="transaction-card__icon transaction-card__icon--${iconType}"><i class="fa-solid ${icon}"></i></div>
                        <div class="transaction-card__details">
                            <p class="transaction-card__description">${tx.description}</p>
                            <p class="transaction-card__date">${tx.date}</p>
                        </div>
                        <div class="transaction-card__amount transaction-card__amount--${amountColor}">${amountSign} ৳${Math.abs(tx.amount).toLocaleString()}</div>
                    </div>
                </a>
            `;
        }).join('');
    };



    // --- DATA & EVENT HANDLING ---
    const loadPaymentMethods = async () => {
        try {
            const settingsRef = doc(db, "settings", "paymentMethods");
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists() && docSnap.data().methods) {
                availableMethods = docSnap.data().methods.filter(m => m.isEnabled);
                renderMethodTabs();
            } else {
                renderMethodTabs();
            }
        } catch (error) {
            console.error("Error fetching payment methods:", error);
            tabsContainer.innerHTML = `<p class="a-empty">Could not load payment methods.</p>`;
        }
    };

    // UPDATED with more robust error handling
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('.btn-submit');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner" style="border-color: #2C3E50; border-right-color: transparent; width: 1.2em; height: 1.2em; display: inline-block; animation: spin .8s linear infinite;"></span>`;
        
        try {
            const activeTab = tabsContainer.querySelector('.active');
            if (!activeTab) throw new Error("Please select a payment method.");
            
            const method = availableMethods.find(m => m.id === activeTab.dataset.id);
            const proofData = {};
            method.requiredProofFields.forEach(field => {
                proofData[field.id] = form.querySelector(`#${field.id}`).value;
            });

            const amount = Number(proofData.amount);
            if (isNaN(amount) || amount < 100 || amount > 10000) {
                throw new Error("Deposit amount must be between 100 and 10,000 BDT.");
            }

            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch('/.netlify/functions/requestDeposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ methodName: method.name, proofData })
            });
            
            // ✅ MORE ROBUST RESPONSE HANDLING
            const responseText = await response.text();
            let result;

            try {
                result = JSON.parse(responseText);
            } catch (err) {
                // This catches the "Unexpected end of JSON input" error
                console.error("Server returned non-JSON response:", responseText);
                throw new Error("The server returned an invalid response. Please contact support.");
            }

            if (!response.ok) {
                // Uses the error from the server's JSON response
                throw new Error(result.error || `A server error occurred (status: ${response.status}).`);
            }

            showInfoModal(
                "Request Sent for Approval",
                "Your account balance was successfully loaded, but needs Admin Approval.<br><br>In the meantime, you can post a task using this balance."
            );
            dynamicPaymentSection.innerHTML = `<p class="a-empty">You have a deposit request pending admin approval. You cannot make new requests until it is processed.</p>`;

        } catch (error) {
            console.error("Error submitting deposit request:", error);
            showMessageInForm(form, error.message, true);
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    };

    tabsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('payment-method-tab')) {
            tabsContainer.querySelector('.active')?.classList.remove('active');
            e.target.classList.add('active');
            renderSelectedMethod(e.target.dataset.id);
        }
    });


    const listenToWallet = (userId) => {
        const walletRef = doc(db, "wallets", userId);
        onSnapshot(walletRef, (doc) => {
            const balance = doc.exists() ? (doc.data().balance ?? 0) : 0;
            const formattedBalance = `৳${balance.toLocaleString()}`;
            if (currentBalanceEl) currentBalanceEl.textContent = formattedBalance;
            if (headerBalance) headerBalance.textContent = formattedBalance;
        });
    };


    const listenToHistory = (userId) => {
        const q = query(
            collection(db, "transactions"), 
            where("clientId", "==", userId), 
            orderBy("createdAt", "desc"),
            limit(10)
        );
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
            renderHistory(transactions);
        }, (error) => {
            console.error("Error fetching transaction history: ", error);
            historyListContainer.innerHTML = `<p class="empty-state" style="text-align: center; padding: 1rem;">Could not load transactions.</p>`;
        });
    };



 // Checks for pending requests before showing the deposit form
    const checkPendingRequestsAndLoadMethods = async (userId) => {
        const q = query(collection(db, "depositRequests"), where("clientId", "==", userId), where("status", "==", "pending"));
        try {
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                dynamicPaymentSection.innerHTML = `<p class="a-empty">You have a deposit request pending admin approval. You cannot make new requests until it is processed.</p>`;
            } else {
                loadPaymentMethods();
            }
        } catch (error) {
            console.error("Error checking for pending requests:", error);
            dynamicPaymentSection.innerHTML = `<p class="a-empty error">Could not verify your deposit status. Please try again later.</p>`;
        }
    };
  
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            listenToWallet(currentUserId);
            checkPendingRequestsAndLoadMethods(currentUserId);
            listenToHistory(currentUserId);
        } else {
            window.location.href = '/login.html';
        }
    });
});