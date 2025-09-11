// FILE: /admin/js/admin-job-details.js (With Multi-Step Reject Modal)
import { db } from '/js/firebase-config.js';
import { doc, getDoc, updateDoc, deleteDoc, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- DOM ELEMENTS ---
const breadcrumbs = document.getElementById('breadcrumbs');
const actionBar = document.getElementById('action-bar');
const jobTitleHeader = document.getElementById('job-title-header');
const jobStatus = document.getElementById('job-status');
const instructionList = document.getElementById('instruction-list');
const restrictionList = document.getElementById('restriction-list');
const proofList = document.getElementById('proof-list');
const budgetInfo = document.getElementById('budget-info');
const clientInfo = document.getElementById('client-info');

const adminModal = document.getElementById('admin-modal');
const modalTitle = document.getElementById('admin-modal-title');
const modalBody = document.getElementById('admin-modal-body');
const modalCloseBtn = document.getElementById('admin-modal-close-btn');

let currentJobData = null;
let jobId = null;
let isEditMode = false;

// --- MODAL CONTROLS ---
const showAdminModal = () => adminModal.style.display = 'flex';
const hideAdminModal = () => adminModal.style.display = 'none';
modalCloseBtn.addEventListener('click', hideAdminModal);

// --- RENDER FUNCTIONS ---
const renderDetails = (job, client) => {
    currentJobData = job; // Cache the job data
    breadcrumbs.textContent = `Admin / Jobs / ${job.title}`;
    jobTitleHeader.textContent = job.title;
    jobStatus.textContent = job.status.replace('_', ' ');
    jobStatus.className = `status ${job.status.replace('_', '-')}`;

    const createListItems = (list, data) => {
        list.innerHTML = data.map((item, index) => `<li data-index="${index}">${item}</li>`).join('');
    };
    createListItems(instructionList, job.instructions);
    createListItems(restrictionList, job.restrictions);
    proofList.innerHTML = job.proofs.map((p, index) => `<li data-index="${index}">${p.instruction} <strong>(${p.type})</strong></li>`).join('');

    budgetInfo.innerHTML = `
        <span class="label">Workers</span><span class="value">${job.submissionsReceived} / ${job.workersNeeded}</span>
        <span class="label">Rate</span><span class="value">৳${job.costPerWorker.toFixed(2)}</span>
        <span class="label">Total Cost</span><span class="value">৳${job.totalCost.toFixed(2)}</span>
    `;

    clientInfo.innerHTML = `
        <span class="label">Email</span><span class="value">${client.email}</span>
        <span class="label">Full Name</span><span class="value">${client.fullName || 'N/A'}</span>
        <span class="label">User ID</span><a class="value" href="/admin/user-details.html?id=${job.clientId}">${job.clientId}</a>
    `;

    renderActionButtons(job.status);
};

const renderActionButtons = (status) => {
    actionBar.innerHTML = '';
    if (status === 'pending_review') {
        actionBar.innerHTML += `<button class="btn btn-success" data-action="approve">Approve</button>`;
        actionBar.innerHTML += `<button class="btn btn-danger" data-action="reject">Reject</button>`;
    }
    actionBar.innerHTML += `<button class="btn btn-dark" data-action="edit">Edit</button>`;
    actionBar.innerHTML += `<button class="btn btn-outline-danger" data-action="delete">Delete</button>`;
};

// --- ACTION HANDLERS ---
const handleApprove = () => {
    modalTitle.textContent = 'Approve Job';
    modalBody.innerHTML = `
        <p>Are you sure you want to approve this job and make it live for workers?</p>
        <div class="a-modal-footer">
            <button type="button" class="btn btn-outline" id="approve-cancel-btn">Cancel</button>
            <button type="button" class="btn btn-dark" id="approve-confirm-btn">Yes, Approve</button>
        </div>
    `;
    showAdminModal();

    document.getElementById('approve-confirm-btn').onclick = async () => {
        try {
            await updateDoc(doc(db, 'jobs', jobId), { status: 'active' });
            hideAdminModal();
            loadJobDetails(); // Reload to update UI
        } catch (error) {
            console.error("Error approving job:", error);
            alert("Could not approve job.");
        }
    };
    document.getElementById('approve-cancel-btn').onclick = hideAdminModal;
};

// ✅ --- REJECTION WORKFLOW --- (Completely Rewritten)

// Step 2 of the rejection process: Final confirmation
const renderRejectStep2 = (reason) => {
    modalTitle.textContent = 'Confirm Rejection (Step 2 of 2)';
    modalBody.innerHTML = `
        <div class="info-grid" style="text-align: left;">
            <span class="label">Action:</span><span class="value">Reject Job</span>
            <span class="label">Refund:</span><span class="value"><strong>৳${currentJobData.totalCost.toFixed(2)}</strong> to Client</span>
            <span class="label">Reason:</span><span class="value">${reason}</span>
        </div>
        <p style="margin-top: 1rem;">Are you sure you want to proceed?</p>
        <div class="a-modal-footer">
            <button type="button" class="btn btn-outline" id="reject-back-btn">Go Back</button>
            <button type="button" class="btn btn-danger" id="confirm-reject-final">Yes, Confirm Rejection</button>
        </div>
    `;

    document.getElementById('reject-back-btn').onclick = () => renderRejectStep1(reason);
    document.getElementById('confirm-reject-final').onclick = async () => {
        try {
            const walletRef = doc(db, "wallets", currentJobData.clientId);
            await runTransaction(db, async (transaction) => {
                const walletDoc = await transaction.get(walletRef);
                const newBalance = (walletDoc.data().balance || 0) + currentJobData.totalCost;
                transaction.update(walletRef, { balance: newBalance });
                transaction.update(doc(db, 'jobs', jobId), { status: 'rejected', rejectionReason: reason });
            });
            hideAdminModal();
            loadJobDetails();
        } catch (error) {
            console.error('Rejection failed:', error);
            alert('Rejection failed. See console for details.');
        }
    };
};

// Step 1 of the rejection process: Get the reason
const renderRejectStep1 = (reason = '') => {
    modalTitle.textContent = 'Reject Job (Step 1 of 2)';
    modalBody.innerHTML = `
        <p>This will refund the client. Please provide a clear reason for the rejection.</p>
        <div class="form-group">
            <label for="rejection-reason">Reason for Rejection</label>
            <textarea id="rejection-reason" class="a-textarea" rows="4">${reason}</textarea>
            <small id="reason-error" style="color: var(--a-danger); display: none;">A reason is required.</small>
        </div>
        <div class="a-modal-footer">
            <button type="button" class="btn btn-outline" id="reject-cancel-btn">Cancel</button>
            <button type="button" class="btn btn-dark" id="reject-next-btn">Next</button>
        </div>
    `;

    document.getElementById('reject-cancel-btn').onclick = hideAdminModal;
    document.getElementById('reject-next-btn').onclick = () => {
        const reasonText = document.getElementById('rejection-reason').value.trim();
        const errorEl = document.getElementById('reason-error');
        if (!reasonText) {
            errorEl.style.display = 'block';
            return;
        }
        errorEl.style.display = 'none';
        renderRejectStep2(reasonText);
    };
};

// Main entry point for the rejection workflow
const handleReject = () => {
    renderRejectStep1(); // Start with step 1
    showAdminModal();
};

const toggleEditMode = (enable) => {
    isEditMode = enable;
    const allLists = [instructionList, restrictionList];
    
    if (enable) {
        jobTitleHeader.classList.add('editable-title');
        jobTitleHeader.innerHTML = `<input type="text" class="edit-input" id="edit-title" value="${currentJobData.title}">`;
        
        allLists.forEach(list => {
            list.classList.add('details-list-edit');
            list.querySelectorAll('li').forEach(item => {
                item.innerHTML = `<input type="text" class="edit-input" value="${item.textContent}">`;
            });
        });

        actionBar.innerHTML = `
            <button class="btn btn-success" data-action="save">Save Changes</button>
            <button class="btn btn-outline" data-action="cancel">Cancel</button>
        `;
    } else {
        loadJobDetails();
    }
};

const handleSaveChanges = async () => {
    try {
        const updatedData = {
            title: document.getElementById('edit-title').value,
            instructions: Array.from(instructionList.querySelectorAll('input')).map(input => input.value),
            restrictions: Array.from(restrictionList.querySelectorAll('input')).map(input => input.value),
        };

        await updateDoc(doc(db, 'jobs', jobId), updatedData);
        
        modalTitle.textContent = 'Success';
        modalBody.innerHTML = `<p>Job details have been updated. You can now approve the job. An automated ticket will notify the client upon approval.</p>
        <div class="a-modal-footer">
            <button type="button" class="btn btn-dark" id="save-ok-btn">OK</button>
        </div>`;
        showAdminModal();
        document.getElementById('save-ok-btn').onclick = () => {
            hideAdminModal();
            toggleEditMode(false);
        };

    } catch (error) {
        console.error("Error saving changes:", error);
        alert("Could not save changes.");
    }
};

const handleDelete = () => {
    modalTitle.textContent = 'Delete Job';
    modalBody.innerHTML = `
        <p>Are you sure you want to permanently delete this job? This will refund the client and cannot be undone.</p>
        <div class="a-modal-footer">
            <button type="button" class="btn btn-outline" onclick="document.getElementById('admin-modal').style.display='none'">Cancel</button>
            <button type="button" class="btn btn-danger" id="confirm-delete">Yes, Delete Permanently</button>
        </div>
    `;
    showAdminModal();
    document.getElementById('confirm-delete').onclick = async () => {
        try {
            const walletRef = doc(db, "wallets", currentJobData.clientId);
            await runTransaction(db, async (transaction) => {
                const walletDoc = await transaction.get(walletRef);
                const newBalance = (walletDoc.data().balance || 0) + currentJobData.totalCost;
                transaction.update(walletRef, { balance: newBalance });
                transaction.delete(doc(db, 'jobs', jobId));
            });
            hideAdminModal();
            alert('Job deleted and client refunded.');
            window.location.href = '/admin/jobs.html';
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Delete failed. See console for details.');
        }
    };
};

const loadJobDetails = async () => {
    const params = new URLSearchParams(window.location.search);
    jobId = params.get('id');
    if (!jobId) {
        document.querySelector('.details-grid').innerHTML = '<h2>Error: No Job ID Provided</h2>';
        return;
    }
    
    try {
        const jobRef = doc(db, 'jobs', jobId);
        const jobSnap = await getDoc(jobRef);
        if (!jobSnap.exists()) throw new Error('Job not found');
        const jobData = jobSnap.data();

        const clientRef = doc(db, 'users', jobData.clientId);
        const clientSnap = await getDoc(clientRef);
        if (!clientSnap.exists()) throw new Error('Client not found');
        
        renderDetails(jobData, clientSnap.data());
    } catch (error) {
        console.error("Error loading job details:", error);
        document.querySelector('.details-grid').innerHTML = `<h2>Error: ${error.message}</h2>`;
    }
};

// --- INITIALIZATION ---
document.addEventListener('adminReady', () => {
    loadJobDetails();
    actionBar.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action === 'approve') handleApprove();
        if (action === 'reject') handleReject();
        if (action === 'delete') handleDelete();
        if (action === 'edit') toggleEditMode(true);
        if (action === 'save') handleSaveChanges();
        if (action === 'cancel') toggleEditMode(false);
    });
});