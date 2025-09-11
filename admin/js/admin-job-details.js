// FILE: /admin/js/admin-job-details.js (FINAL & CORRECTED)
import { db } from '/js/firebase-config.js';
import { doc, getDoc, updateDoc, deleteDoc, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('adminReady', () => {
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

    // --- MODAL CONTROLS ---
    const showAdminModal = () => adminModal.style.display = 'flex';
    const hideAdminModal = () => adminModal.style.display = 'none';
    modalCloseBtn.addEventListener('click', hideAdminModal);
    adminModal.addEventListener('click', (e) => {
        if (e.target === adminModal) hideAdminModal();
    });

    // --- RENDER FUNCTIONS ---
    const renderDetails = (job, client) => {
        currentJobData = job;
        jobId = new URLSearchParams(window.location.search).get('id');
        breadcrumbs.textContent = `Admin / Jobs / ${job.title}`;
        jobTitleHeader.textContent = job.title;
        jobStatus.textContent = job.status.replace('_', ' ');
        jobStatus.className = `status ${job.status.replace('_', '-')}`;

        instructionList.innerHTML = job.instructions.map(item => `<li>${item}</li>`).join('');
        restrictionList.innerHTML = job.restrictions.map(item => `<li>${item}</li>`).join('');
        proofList.innerHTML = job.proofs.map(p => `<li>${p.instruction} <strong>(${p.type})</strong></li>`).join('');

        budgetInfo.innerHTML = `
            <span class="label">Workers</span><span class="value">${job.submissionsApproved || 0} / ${job.workersNeeded}</span>
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
            actionBar.innerHTML += `<button class="btn btn-accent" data-action="approve">Approve</button>`;
            actionBar.innerHTML += `<button class="btn btn-danger" data-action="reject">Reject</button>`;
        }
        actionBar.innerHTML += `<button class="btn btn-dark" data-action="edit" disabled title="Coming Soon">Edit</button>`;
        actionBar.innerHTML += `<button class="btn btn-danger" data-action="delete">Delete</button>`;
    };

    // --- ACTION HANDLERS ---
    const handleApprove = () => {
        modalTitle.textContent = 'Approve Job';
        modalBody.innerHTML = `
            <p>Are you sure you want to approve this job and make it live for workers?</p>
            <div class="a-modal-footer">
                <button type="button" class="btn" id="generic-cancel-btn">Cancel</button>
                <button type="button" class="btn btn-accent" id="generic-confirm-btn">Yes, Approve</button>
            </div>
        `;
        showAdminModal();

        document.getElementById('generic-confirm-btn').onclick = async () => {
            try {
                await updateDoc(doc(db, 'jobs', jobId), { status: 'active' });
                hideAdminModal();
                loadJobDetails();
            } catch (error) {
                console.error("Error approving job:", error);
                alert("Could not approve job.");
            }
        };
        document.getElementById('generic-cancel-btn').onclick = hideAdminModal;
    };

    const handleReject = () => {
        modalTitle.textContent = 'Reject Job';
        modalBody.innerHTML = `
            <p>This will refund the client. Please provide a clear reason for the rejection.</p>
            <div class="form-group">
                <label for="rejection-reason">Reason for Rejection</label>
                <textarea id="rejection-reason" class="a-textarea" rows="4"></textarea>
            </div>
            <div class="a-modal-footer">
                <button type="button" class="btn" id="generic-cancel-btn">Cancel</button>
                <button type="button" class="btn btn-danger" id="generic-confirm-btn">Confirm Rejection</button>
            </div>
        `;
        showAdminModal();

        document.getElementById('generic-confirm-btn').onclick = async () => {
            const reason = document.getElementById('rejection-reason').value.trim();
            if (!reason) return alert('A reason is required.');
            try {
                const walletRef = doc(db, "wallets", currentJobData.clientId);
                const jobRef = doc(db, 'jobs', jobId);

                await runTransaction(db, async (transaction) => {
                    const walletDoc = await transaction.get(walletRef);
                    if (!walletDoc.exists()) throw new Error("Client wallet not found!");
                    
                    const newBalance = (walletDoc.data().balance || 0) + currentJobData.totalCost;
                    
                    transaction.update(walletRef, { 
                        balance: newBalance,
                        escrow: (walletDoc.data().escrow || 0) - currentJobData.totalCost
                    });
                    transaction.update(jobRef, { status: 'rejected', rejectionReason: reason });
                });

                hideAdminModal();
                loadJobDetails();
            } catch (error) {
                console.error('Rejection failed:', error);
                alert('Rejection failed. See console for details.');
            }
        };
        document.getElementById('generic-cancel-btn').onclick = hideAdminModal;
    };

    const handleDelete = () => {
        modalTitle.textContent = 'Delete Job';
        modalBody.innerHTML = `
            <p>Are you sure you want to permanently delete this job? If the job was active, the client's escrowed funds will be refunded. This cannot be undone.</p>
            <div class="a-modal-footer">
                <button type="button" class="btn" id="generic-cancel-btn">Cancel</button>
                <button type="button" class="btn btn-danger" id="generic-confirm-btn">Yes, Delete Permanently</button>
            </div>
        `;
        showAdminModal();
        
        document.getElementById('generic-confirm-btn').onclick = async () => {
            try {
                const jobRef = doc(db, 'jobs', jobId);
                if (currentJobData.remainingBudget > 0) {
                    const walletRef = doc(db, "wallets", currentJobData.clientId);
                    await runTransaction(db, async (transaction) => {
                        const walletDoc = await transaction.get(walletRef);
                        if(walletDoc.exists()){
                            transaction.update(walletRef, { 
                                escrow: (walletDoc.data().escrow || 0) - currentJobData.remainingBudget, 
                                balance: (walletDoc.data().balance || 0) + currentJobData.remainingBudget 
                            });
                        }
                        transaction.delete(jobRef);
                    });
                } else {
                    await deleteDoc(jobRef);
                }
                hideAdminModal();
                alert('Job deleted successfully.');
                window.location.href = '/admin/jobs.html';
            } catch (error) {
                console.error('Delete failed:', error);
                alert('Delete failed.');
            }
        };
        document.getElementById('generic-cancel-btn').onclick = hideAdminModal;
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
    actionBar.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action === 'approve') handleApprove();
        if (action === 'reject') handleReject();
        if (action === 'delete') handleDelete();
    });
    
    loadJobDetails();
});