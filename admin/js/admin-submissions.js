// FILE: /admin/js/admin-submissions.js (NEW FILE)
import { auth, db } from '/js/firebase-config.js';
import { collectionGroup, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('adminReady', () => {
    const tabsContainer = document.getElementById('submission-tabs');
    const tbody = document.getElementById('submissions-tbody');
    const modal = document.getElementById('confirmation-modal');
    const proofModal = document.getElementById('proof-modal');

    let allSubmissions = [];
    let activeTab = 'pending';
    let currentAction = {};

    const renderTabs = () => {
        const counts = {
            pending: allSubmissions.filter(s => s.status === 'pending').length,
            resubmit_pending: allSubmissions.filter(s => s.status === 'resubmit_pending').length,
            approved: allSubmissions.filter(s => s.status === 'approved').length,
            rejected: allSubmissions.filter(s => s.status === 'rejected').length
        };

        tabsContainer.innerHTML = `
            <button class="a-tab-btn ${activeTab === 'pending' ? 'active' : ''}" data-status="pending">Pending (${counts.pending})</button>
            <button class="a-tab-btn ${activeTab === 'resubmit_pending' ? 'active' : ''}" data-status="resubmit_pending">Awaiting Resubmission (${counts.resubmit_pending})</button>
            <button class="a-tab-btn ${activeTab === 'approved' ? 'active' : ''}" data-status="approved">Approved (${counts.approved})</button>
            <button class="a-tab-btn ${activeTab === 'rejected' ? 'active' : ''}" data-status="rejected">Rejected (${counts.rejected})</button>
        `;
    };

    const renderTable = () => {
        const filtered = allSubmissions.filter(s => {
            if (activeTab === 'pending') return s.status === 'pending';
            if (activeTab === 'resubmit_pending') return s.status === 'resubmit_pending';
            if (activeTab === 'approved') return s.status === 'approved';
            if (activeTab === 'rejected') return s.status === 'rejected';
            return false;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="a-empty">No submissions in this category.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(sub => `
            <tr>
                <td>
                    <div>${sub.jobTitle || 'N/A'}</div>
                    <a class="view-proof-link" data-submission-id="${sub.id}" data-job-id="${sub.jobId}">View Proof</a>
                </td>
                <td>${sub.workerId.substring(0, 8)}...</td>
                <td>${sub.clientId.substring(0, 8)}...</td>
                <td>${sub.submittedAt.toDate().toLocaleString()}</td>
                <td><span class="status ${sub.status}">${sub.status.replace('_', ' ')}</span></td>
                <td>
                    <div class="a-actions">
                        <button class="a-action-btn approve" title="Approve" data-action="approve" data-submission-id="${sub.id}" data-job-id="${sub.jobId}"><i class="fa-solid fa-check"></i></button>
                        <button class="a-action-btn reject" title="Reject" data-action="reject" data-submission-id="${sub.id}" data-job-id="${sub.jobId}"><i class="fa-solid fa-times"></i></button>
                        <button class="a-action-btn ban" title="Ban Worker" data-action="ban" data-worker-id="${sub.workerId}"><i class="fa-solid fa-user-slash"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    };

    const showModal = (action, data) => {
        currentAction = { action, ...data };
        const title = document.getElementById('modal-title');
        const message = document.getElementById('modal-message');
        const confirmBtn = document.getElementById('modal-confirm-btn');

        if (action === 'approve') {
            title.textContent = 'Approve Submission';
            message.textContent = 'Are you sure you want to approve this submission? The worker will be paid.';
            confirmBtn.className = 'btn btn-accent';
            confirmBtn.textContent = 'Approve';
        } else if (action === 'reject') {
            title.textContent = 'Reject Submission';
            message.textContent = 'Are you sure you want to reject this submission?';
            confirmBtn.className = 'btn btn-dark'; // A less prominent color
            confirmBtn.textContent = 'Reject';
        } else if (action === 'ban') {
            title.textContent = 'Ban Worker';
            message.textContent = `Are you sure you want to permanently ban worker ${data.workerId.substring(0, 8)}...? This cannot be undone.`;
            confirmBtn.className = 'btn btn-danger'; // Custom danger style needed
            confirmBtn.textContent = 'Ban Worker';
        }
        modal.hidden = false;
    };
    
    const showProofModal = (proofs) => {
        const body = document.getElementById('proof-modal-body');
        body.innerHTML = proofs.map(p => {
             let answerHTML = '';
            if (p.type === 'screenshot') answerHTML = `<a href="${p.answer}" target="_blank"><img src="${p.answer}" style="max-width: 100%;"></a>`;
            else answerHTML = `<p>${p.answer}</p>`;
            return `<div class="proof-item"><h5>${p.instruction}</h5>${answerHTML}</div>`;
        }).join('');
        proofModal.hidden = false;
    };

    const handleConfirmAction = async () => {
        const { action, jobId, submissionId, workerId } = currentAction;
        const btn = document.getElementById('modal-confirm-btn');
        btn.disabled = true;
        btn.textContent = 'Processing...';

        try {
            const token = await auth.currentUser.getIdToken();
            let endpoint = '';
            let body = {};
            if (action === 'approve' || action === 'reject') {
                endpoint = '/.netlify/functions/adminManageSubmission';
                body = { jobId, submissionId, action };
            } else if (action === 'ban') {
                endpoint = '/.netlify/functions/adminBanUser';
                body = { userIdToBan: workerId };
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Action failed.');
            }
            // Success
        } catch (error) {
            console.error(`Failed to ${action}:`, error);
            alert(`Error: ${error.message}`);
        } finally {
            modal.hidden = true;
            btn.disabled = false;
        }
    };

    // --- Event Listeners ---
    tabsContainer.addEventListener('click', e => {
        if (e.target.matches('.a-tab-btn')) {
            activeTab = e.target.dataset.status;
            renderTabs();
            renderTable();
        }
    });

    tbody.addEventListener('click', e => {
        const target = e.target;
        const actionBtn = target.closest('.a-action-btn');
        const proofLink = target.closest('.view-proof-link');

        if (actionBtn) {
            const data = {
                jobId: actionBtn.dataset.jobId,
                submissionId: actionBtn.dataset.submissionId,
                workerId: actionBtn.dataset.workerId
            };
            showModal(actionBtn.dataset.action, data);
        }
        if (proofLink) {
            const subId = proofLink.dataset.submissionId;
            const submission = allSubmissions.find(s => s.id === subId);
            if(submission) showProofModal(submission.proofs);
        }
    });
    
    modal.querySelector('#modal-confirm-btn').addEventListener('click', handleConfirmAction);
    modal.querySelector('#modal-cancel-btn').addEventListener('click', () => modal.hidden = true);
    modal.querySelector('#modal-close-btn').addEventListener('click', () => modal.hidden = true);
    proofModal.querySelector('#proof-modal-close-btn').addEventListener('click', () => proofModal.hidden = true);
    
    // --- Initial Load ---
    const q = query(collectionGroup(db, 'submissions'), orderBy('submittedAt', 'desc'));
    onSnapshot(q, (snapshot) => {
        allSubmissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTabs();
        renderTable();
    }, console.error);
});