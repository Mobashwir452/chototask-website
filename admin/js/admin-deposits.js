// /js/admin-deposits.js - FINAL VERSION

import { db } from '/js/firebase-config.js';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, writeBatch, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- DOM ELEMENTS ---
const tableBody = document.getElementById('deposits-table-body');
const adminModal = document.getElementById('admin-modal');
const modalTitle = document.getElementById('admin-modal-title');
const modalBody = document.getElementById('admin-modal-body');
const modalCloseBtn = document.getElementById('admin-modal-close-btn');

// --- MODAL CONTROLS ---
const showAdminModal = () => adminModal.style.display = 'flex';
const hideAdminModal = () => adminModal.style.display = 'none';
if (modalCloseBtn) modalCloseBtn.addEventListener('click', hideAdminModal);
adminModal.addEventListener('click', (e) => {
    if (e.target === adminModal) hideAdminModal();
});

// --- RENDER FUNCTION ---
const renderTable = (requests) => {
    if (!tableBody) return;
    if (requests.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="a-empty">There are no pending deposit requests.</td></tr>`;
        return;
    }
    tableBody.innerHTML = requests.map(req => {
        const date = req.requestedAt ? req.requestedAt.toDate().toLocaleString() : 'N/A';
        return `
            <tr data-id="${req.id}">
                <td>${date}</td>
                <td>${req.clientEmail}</td>
                <td><strong>৳${req.amount.toLocaleString()}</strong></td>
                <td>${req.transactionId}</td>
                <td>
                    <button class="btn-verify" data-action="verify">Verify</button>
                </td>
            </tr>
        `;
    }).join('');
};

// --- ACTION HANDLERS ---
const handleVerify = async (requestId) => {
    try {
        const requestRef = doc(db, "depositRequests", requestId);
        const requestSnap = await getDoc(requestRef);
        if (!requestSnap.exists()) {
            throw new Error("Deposit request not found.");
        }
        const requestData = requestSnap.data();

        modalTitle.textContent = "Verify Deposit Request";
        modalBody.innerHTML = `
            <div class="info-grid">
                <div class="info-item"><span>Client:</span><strong>${requestData.clientEmail}</strong></div>
                <div class="info-item"><span>Requested:</span><strong>৳${requestData.amount}</strong></div>
                <div class="info-item"><span>Transaction ID:</span><strong>${requestData.transactionId}</strong></div>
            </div>
            <form id="verify-form">
                <div class="form-group" style="margin-top: 1rem;">
                    <label for="actual-amount">Actual Amount Received</label>
                    <input type="number" id="actual-amount" class="a-search" value="${requestData.amount}" required>
                </div>
                <div class="a-modal-footer">
                    <button type="button" class="btn btn-danger" id="btn-reject">Reject</button>
                    <button type="submit" class="btn btn-dark">Approve Deposit</button>
                </div>
            </form>
        `;
        showAdminModal();

        document.getElementById('verify-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const actualAmount = parseFloat(document.getElementById('actual-amount').value);
            if (!isNaN(actualAmount)) {
                // Pass the original request data to the processing function
                await processDeposit(requestData, requestId, actualAmount, 'approved');
            }
        });
        document.getElementById('btn-reject').addEventListener('click', () => {
             if (confirm("Are you sure you want to reject this request? This will reverse the funds from the user's wallet.")) {
                processDeposit(requestData, requestId, 0, 'rejected');
             }
        });

    } catch (error) {
        console.error("Error opening verify modal:", error);
        alert(error.message);
    }
};

// ✅ REPLACED with smarter logic to prevent double-deposits
const processDeposit = async (originalRequestData, requestId, actualAmount, newStatus) => {
    const { clientId, amount: originalAmount, userTransactionId } = originalRequestData;
    
    // Calculate the difference to fix the wallet balance
    const difference = actualAmount - originalAmount;

    // Define all database references
    const walletRef = doc(db, "wallets", clientId);
    const requestRef = doc(db, "depositRequests", requestId);
    const userTransactionRef = doc(db, "transactions", userTransactionId);
    const activityRef = doc(collection(db, "activities"));


    try {
        const batch = writeBatch(db);

        // 1. Update the original deposit request (the admin's to-do item)
        batch.update(requestRef, {
            status: newStatus,
            actualAmount: actualAmount,
            reviewedAt: serverTimestamp()
        });

        // 2. Fix the wallet balance by the calculated difference
        if (difference !== 0) {
             batch.update(walletRef, { balance: increment(difference) });
        }

        // 3. Update the original user-facing transaction log
        batch.update(userTransactionRef, {
            status: newStatus,
            amount: actualAmount, // Update to the actual amount
            description: originalRequestData.methodName + ' Deposit' // Clean up description
        });

        // 4. If an adjustment was made, create a NEW transaction log for it
        if (difference !== 0 && newStatus === 'approved') {
            const adjustmentRef = doc(collection(db, "transactions"));
            batch.set(adjustmentRef, {
                clientId: clientId,
                amount: difference,
                createdAt: serverTimestamp(),
                description: 'Deposit amount adjustment by admin',
                type: 'deposit_adjustment',
                status: 'approved'
            });
        }
        
        // When rejecting, reverse the full original amount if no adjustment is specified
        if (newStatus === 'rejected') {
            batch.update(walletRef, { balance: increment(-originalAmount) });
            batch.update(userTransactionRef, { status: 'rejected', amount: 0 });
        }


        // ✅ ADD THIS LOGIC before batch.commit()
        if (newStatus === 'approved') {
            batch.set(activityRef, {
                userId: clientId,
                userRole: 'client',
                type: 'deposit_approved',
                text: `Your deposit of ৳${actualAmount.toLocaleString()} was approved by an admin.`,
                timestamp: serverTimestamp()
            });
        } else if (newStatus === 'rejected') {
            batch.set(activityRef, {
                userId: clientId,
                userRole: 'client',
                type: 'deposit_rejected',
                text: `Your deposit request of ৳${originalAmount.toLocaleString()} was rejected.`,
                timestamp: serverTimestamp()
            });
        }

        await batch.commit();

        // Show success message
        hideAdminModal();
        modalTitle.textContent = 'Success';
        modalBody.innerHTML = `<p style="text-align:center;">Request has been successfully ${newStatus}.</p><div class="a-modal-footer"><button id="success-ok" class="btn btn-dark">OK</button></div>`;
        showAdminModal();
        document.getElementById('success-ok').addEventListener('click', hideAdminModal);

    } catch (error) {
        console.error("Error processing deposit:", error);
        hideAdminModal();
        modalTitle.textContent = 'Error';
        modalBody.innerHTML = `<p style="text-align:center;">Failed to process the request: ${error.message}</p><div class="a-modal-footer"><button id="error-ok" class="btn btn-dark">OK</button></div>`;
        showAdminModal();
        document.getElementById('error-ok').addEventListener('click', hideAdminModal);
    }
};

// --- EVENT LISTENERS & INITIALIZATION ---
document.addEventListener('adminReady', () => {
    const q = query(collection(db, "depositRequests"), where("status", "==", "pending"), orderBy("requestedAt", "asc"));
    onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTable(requests);
    });

    tableBody.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'verify') {
            const requestId = e.target.closest('tr').dataset.id;
            handleVerify(requestId);
        }
    });
});