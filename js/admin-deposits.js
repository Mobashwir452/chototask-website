// FILE: /js/admin-deposits.js (FULLY FUNCTIONAL VERSION)

import { db } from '/js/firebase-config.js';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
                    <button type="submit" class="btn btn-dark">Approve & Add Funds</button>
                </div>
            </form>
        `;
        showAdminModal();

        // Add listeners for the new modal buttons
        document.getElementById('verify-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const actualAmount = parseFloat(document.getElementById('actual-amount').value);
            if (!isNaN(actualAmount) && actualAmount > 0) {
                processDeposit(requestData.clientId, requestId, actualAmount, 'approved');
            }
        });
        document.getElementById('btn-reject').addEventListener('click', () => {
             if (confirm("Are you sure you want to reject this request?")) {
                processDeposit(requestData.clientId, requestId, 0, 'rejected');
             }
        });

    } catch (error) {
        console.error("Error opening verify modal:", error);
        alert(error.message);
    }
};

const processDeposit = async (clientId, requestId, actualAmount, newStatus) => {
    const walletRef = doc(db, "wallets", clientId);
    const requestRef = doc(db, "depositRequests", requestId);

    try {
        const batch = writeBatch(db);

        // Action 1: Update the deposit request status
        batch.update(requestRef, {
            status: newStatus,
            actualAmount: actualAmount,
            reviewedAt: serverTimestamp()
        });

        // Action 2: If approved, update the client's wallet
        if (newStatus === 'approved' && actualAmount > 0) {
            batch.set(walletRef, {
                balance: admin.firestore.FieldValue.increment(actualAmount)
            }, { merge: true });
        }

        await batch.commit();
        hideAdminModal();
        alert(`Request has been ${newStatus}.`);
    } catch (error) {
        console.error("Error processing deposit:", error);
        alert("Failed to process the request. Check the console.");
        hideAdminModal();
    }
};


// --- EVENT LISTENERS & INITIALIZATION ---
document.addEventListener('adminReady', () => {
    // Real-time listener for pending requests
    const q = query(collection(db, "depositRequests"), where("status", "==", "pending"), orderBy("requestedAt", "asc"));
    onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTable(requests);
    });

    // Delegated event listener for the whole table
    tableBody.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'verify') {
            const requestId = e.target.closest('tr').dataset.id;
            handleVerify(requestId);
        }
    });
});