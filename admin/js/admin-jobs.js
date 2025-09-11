// FILE: /admin/js/admin-jobs.js (Updated)

import { db } from '/js/firebase-config.js';
import { collection, query, where, orderBy, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- DOM ELEMENTS ---
const tabsContainer = document.getElementById('job-filter-tabs');
const tableBody = document.getElementById('jobs-table-body');
const adminModal = document.getElementById('admin-modal');
const modalTitle = document.getElementById('admin-modal-title');
const modalBody = document.getElementById('admin-modal-body');
const modalCloseBtn = document.getElementById('admin-modal-close-btn');

// --- MODAL CONTROLS ---
const showAdminModal = () => adminModal.classList.add('visible');
const hideAdminModal = () => adminModal.classList.remove('visible');

modalCloseBtn.addEventListener('click', hideAdminModal);
adminModal.addEventListener('click', (e) => {
    if (e.target === adminModal) hideAdminModal();
});

// --- RENDER FUNCTION ---
const renderJobsTable = (jobDocs) => {
    if (jobDocs.empty) {
        tableBody.innerHTML = '<tr><td colspan="6" class="a-empty">No jobs found for this filter.</td></tr>';
        return;
    }

    tableBody.innerHTML = jobDocs.docs.map(doc => {
        const job = doc.data();
        const jobId = doc.id;
        const date = job.createdAt?.toDate().toLocaleDateString() || 'N/A';
        const statusClass = job.status.replace('_', '-');

        // ✅ FIX: The "View" button is now a link, and actions are combined
        let actionButtons = `
            <a href="/admin/job-details.html?id=${jobId}" class="a-action-btn" title="View Details"><i class="fa-solid fa-eye"></i></a>
        `;
        if (job.status === 'pending_review') {
            actionButtons += `
                <button class="a-action-btn approve" data-action="approve" data-id="${jobId}" title="Approve Job"><i class="fa-solid fa-check"></i></button>
                <button class="a-action-btn reject" data-action="reject" data-id="${jobId}" title="Reject Job"><i class="fa-solid fa-times"></i></button>
            `;
        }

        return `
            <tr>
                <td>
                    <strong>${job.title}</strong>
                    <small>${job.clientId}</small>
                </td>
                <td>৳${job.totalCost.toFixed(2)}</td>
                <td>${job.category}</td>
                <td>${date}</td>
                <td><span class="status ${statusClass}">${job.status.replace('_', ' ')}</span></td>
                <td><div class="a-actions">${actionButtons}</div></td>
            </tr>
        `;
    }).join('');
};

// --- DATA LOADING ---
const loadJobs = async (status = 'pending_review') => {
    tableBody.innerHTML = '<tr><td colspan="6" class="a-empty">Loading jobs...</td></tr>';
    try {
        let q;
        const jobsRef = collection(db, 'jobs');

        if (status === 'all') {
            q = query(jobsRef, orderBy('createdAt', 'desc'));
        } else {
            q = query(jobsRef, where('status', '==', status), orderBy('createdAt', 'desc'));
        }
        
        const querySnapshot = await getDocs(q);
        renderJobsTable(querySnapshot);
    } catch (error) {
        console.error("Error loading jobs:", error);
        tableBody.innerHTML = '<tr><td colspan="6" class="a-empty error">Could not load data.</td></tr>';
    }
};

// --- ACTION HANDLERS ---
const handleApprove = (jobId) => {
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
            loadJobs(document.querySelector('.a-tab-item.active').dataset.status); // Reload current tab
        } catch (error) {
            console.error("Error approving job:", error);
            alert("Could not approve job.");
        }
    };
    document.getElementById('approve-cancel-btn').onclick = hideAdminModal;
};

const handleReject = (jobId) => {
    modalTitle.textContent = 'Reject Job';
    modalBody.innerHTML = `
        <div class="form-group">
            <label for="rejection-reason">Reason for Rejection (required)</label>
            <textarea id="rejection-reason" class="a-textarea" rows="4" placeholder="Provide clear feedback for the client..."></textarea>
        </div>
        <div class="a-modal-footer">
            <button type="button" class="btn btn-outline" id="reject-cancel-btn">Cancel</button>
            <button type="button" class="btn btn-danger" id="reject-confirm-btn">Confirm Rejection</button>
        </div>
    `;
    showAdminModal();
    
    document.getElementById('reject-confirm-btn').onclick = async () => {
        const reason = document.getElementById('rejection-reason').value;
        if (!reason.trim()) {
            alert('A reason for rejection is required.');
            return;
        }

        try {
            await updateDoc(doc(db, 'jobs', jobId), { 
                status: 'rejected',
                rejectionReason: reason 
            });
            hideAdminModal();
            loadJobs(document.querySelector('.a-tab-item.active').dataset.status); // Reload current tab
        } catch (error) {
            console.error("Error rejecting job:", error);
            alert("Could not reject job.");
        }
    };
    document.getElementById('reject-cancel-btn').onclick = hideAdminModal;
};

// --- INITIALIZATION ---
document.addEventListener('adminReady', () => {
    loadJobs('pending_review');

    tabsContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            tabsContainer.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            loadJobs(e.target.dataset.status);
        }
    });

    tableBody.addEventListener('click', (e) => {
        const button = e.target.closest('.a-action-btn');
        if (!button) return;

        const { action, id } = button.dataset;
        // The view action is now handled by the <a> tag, so no JS is needed.
        if (action === 'approve') handleApprove(id);
        if (action === 'reject') handleReject(id);
    });
});