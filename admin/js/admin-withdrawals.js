// /admin/js/admin-withdrawals.js

import { db } from '/js/firebase-config.js';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, writeBatch, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- DOM ELEMENTS ---
const tableBody = document.getElementById('withdrawals-table-body');
const adminModal = document.getElementById('admin-modal');
const modalTitle = document.getElementById('admin-modal-title');
const modalBody = document.getElementById('admin-modal-body');
const modalCloseBtn = document.getElementById('admin-modal-close-btn');

// --- MODAL CONTROLS ---
const showAdminModal = () => adminModal.classList.add('visible');
const hideAdminModal = () => adminModal.classList.remove('visible');
if (modalCloseBtn) modalCloseBtn.addEventListener('click', hideAdminModal);
adminModal.addEventListener('click', (e) => {
    if (e.target === adminModal) hideAdminModal();
});

// --- RENDER FUNCTION ---
const renderTable = (requests) => {
    if (!tableBody) return;
    if (requests.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="a-empty">There are no pending withdrawal requests.</td></tr>`;
        return;
    }
    tableBody.innerHTML = requests.map(req => {
        const date = req.requestedAt ? req.requestedAt.toDate().toLocaleString() : 'N/A';
        return `
            <tr data-id="${req.id}">
                <td>${date}</td>
                <td>${req.workerEmail}</td>
                <td><strong>৳${req.amount.toLocaleString()}</strong></td>
                <td>${req.method.methodName} - ${req.method.accountDetails}</td>
                <td>
                    <button class="btn btn-dark" data-action="process">Process</button>
                </td>
            </tr>
        `;
    }).join('');
};

// --- ACTION HANDLERS ---
const handleProcess = async (requestId) => {
    try {
        const requestRef = doc(db, "withdrawalRequests", requestId);
        const requestSnap = await getDoc(requestRef);
        if (!requestSnap.exists()) {
            throw new Error("Withdrawal request not found.");
        }
        const requestData = requestSnap.data();

        modalTitle.textContent = "Process Withdrawal Request";
        modalBody.innerHTML = `
            <div class="info-grid">
                <div class="info-item"><span>Worker:</span><strong>${requestData.workerEmail}</strong></div>
                <div class="info-item"><span>Amount:</span><strong>৳${requestData.amount.toLocaleString()}</strong></div>
                <div class="info-item"><span>Method:</span><strong>${requestData.method.methodName}</strong></div>
                <div class="info-item"><span>Details:</span><strong>${requestData.method.accountDetails}</strong></div>
            </div>
            <p style="margin-top: 1rem;">Are you sure you want to approve this withdrawal? This action is irreversible.</p>
            <div class="a-modal-footer">
                <button type="button" class="btn btn-danger" id="btn-reject">Reject</button>
                <button type="button" class="btn btn-dark" id="btn-approve">Approve Withdrawal</button>
            </div>
        `;
        showAdminModal();

        document.getElementById('btn-approve').onclick = () => processWithdrawal(requestData, requestId, 'approved');
        document.getElementById('btn-reject').onclick = () => processWithdrawal(requestData, requestId, 'rejected');

    } catch (error) {
        console.error("Error opening process modal:", error);
        alert(error.message);
    }
};

// এই নতুন ফাংশনটি দিয়ে আপনার পুরনো processWithdrawal ফাংশনটি প্রতিস্থাপন করুন

// এই নতুন ফাংশনটি দিয়ে আপনার পুরনো processWithdrawal ফাংশনটি প্রতিস্থাপন করুন

const processWithdrawal = async (originalRequestData, requestId, newStatus) => {
    const { workerId, amount, userTransactionId, method } = originalRequestData;
    
    const walletRef = doc(db, "wallets", workerId);
    const requestRef = doc(db, "withdrawalRequests", requestId);
    const userTransactionRef = doc(db, "transactions", userTransactionId);
    const activityRef = doc(collection(db, "activities"));

    try {
        const batch = writeBatch(db);

        // 1. Update the withdrawal request status
        batch.update(requestRef, {
            status: newStatus,
            reviewedAt: serverTimestamp()
        });

        if (newStatus === 'approved') {
            // On approval, just decrease the escrow amount.
            batch.update(walletRef, { 
                escrow: increment(-amount) 
            });
            batch.update(userTransactionRef, { status: 'approved' });
            batch.set(activityRef, {
                userId: workerId,
                userRole: 'worker',
                type: 'withdrawal_approved',
                text: `Your withdrawal request of ৳${amount.toLocaleString()} was approved.`,
                timestamp: serverTimestamp()
            });

        } else if (newStatus === 'rejected') {
            // On rejection, move funds back from escrow to main balance
            batch.update(walletRef, {
                escrow: increment(-amount),
                balance: increment(amount) 
            });
            
            // ✅ পরিবর্তন: রিজেক্ট হলে স্ট্যাটাস, টাইপ এবং বিবরণ আপডেট করা হচ্ছে
            batch.update(userTransactionRef, { 
                status: 'rejected',
                type: 'adjustment', // টাইপ পরিবর্তন করে 'adjustment' করা হলো
                description: `Withdrawal request via ${method.methodName} rejected` // বিবরণ পরিবর্তন
            });

            batch.set(activityRef, {
                userId: workerId,
                userRole: 'worker',
                type: 'withdrawal_rejected',
                text: `Your withdrawal request of ৳${amount.toLocaleString()} was rejected and funds returned to your balance.`,
                timestamp: serverTimestamp()
            });
        }

        await batch.commit();

        hideAdminModal();
        modalTitle.textContent = 'Success';
        modalBody.innerHTML = `
            <p style="text-align:center;">Request has been successfully ${newStatus}.</p>
            <div class="a-modal-footer">
                <button id="success-ok" class="btn btn-dark">OK</button>
            </div>
        `;
        showAdminModal();
        document.getElementById('success-ok').addEventListener('click', hideAdminModal);

    } catch (error) {
        console.error("Error processing withdrawal:", error);
        
        hideAdminModal();
        modalTitle.textContent = 'Error';
        modalBody.innerHTML = `
            <p style="text-align:center;">Failed to process the request: ${error.message}</p>
            <div class="a-modal-footer">
                <button id="error-ok" class="btn btn-dark">OK</button>
            </div>
        `;
        showAdminModal();
        document.getElementById('error-ok').addEventListener('click', hideAdminModal);
    }
};

// --- EVENT LISTENERS & INITIALIZATION ---
document.addEventListener('adminReady', () => {
    const q = query(collection(db, "withdrawalRequests"), where("status", "==", "pending"), orderBy("requestedAt", "asc"));
    onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTable(requests);
    }, (error) => {
        console.error("Error fetching withdrawals:", error);
        tableBody.innerHTML = `<tr><td colspan="5" class="a-empty error">Could not load data. Check permissions.</td></tr>`;
    });

    tableBody.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'process') {
            const requestId = e.target.closest('tr').dataset.id;
            handleProcess(requestId);
        }
    });
});