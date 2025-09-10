// FILE: /client/js/client-review-submissions.js (FINAL & CORRECTED)

import { auth, db } from '/js/firebase-config.js';
import { collectionGroup, query, where, orderBy, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {
    
    // --- DOM Elements & State ---
    const heroContainer = document.getElementById('hero-container');
    const tabsContainer = document.getElementById('tabs-container');
    const listContainer = document.getElementById('submissions-list-container');
    const successModal = document.getElementById('success-modal');
    const rejectionModal = document.getElementById('rejection-modal');
    const proofModal = document.getElementById('proof-modal');
    
    let allSubmissions = [];
    let activeTab = 'pending';
    let currentUser = null;
    let currentActionInfo = {};
    let timerInterval = null;

    // --- RENDER FUNCTIONS ---
    const renderHero = () => {
        heroContainer.innerHTML = `
            <section class="page-hero">
                <div class="page-hero__icon" style="font-size: 1.5rem;"><i class="fa-solid fa-clipboard-check"></i></div>
                <h1 class="page-hero__title">Review Submissions</h1>
                <p class="page-hero__subtitle">Review and manage all submissions from all your jobs in one place.</p>
            </section>`;
    };

    const renderTabs = () => {
        const counts = {
            pending: allSubmissions.filter(s => s.status === 'pending').length,
            resubmit_pending: allSubmissions.filter(s => s.status === 'resubmit_pending').length,
            approved: allSubmissions.filter(s => s.status === 'approved').length,
            rejected: allSubmissions.filter(s => s.status === 'rejected').length,
        };
        tabsContainer.innerHTML = `
            <button class="tab-btn ${activeTab === 'pending' ? 'active' : ''}" data-tab="pending">Pending Review <span class="count-badge">${counts.pending}</span></button>
            <button class="tab-btn ${activeTab === 'resubmit_pending' ? 'active' : ''}" data-tab="resubmit_pending">Awaiting Resubmission <span class="count-badge">${counts.resubmit_pending}</span></button>
            <button class="tab-btn ${activeTab === 'approved' ? 'active' : ''}" data-tab="approved">Approved <span class="count-badge">${counts.approved}</span></button>
            <button class="tab-btn ${activeTab === 'rejected' ? 'active' : ''}" data-tab="rejected">Rejected <span class="count-badge">${counts.rejected}</span></button>
        `;
    };

    const renderList = () => {
        if (timerInterval) clearInterval(timerInterval);
        
        const filtered = allSubmissions.filter(s => s.status === activeTab);
        if (filtered.length === 0) {
            listContainer.innerHTML = `<p class="empty-list-message">No submissions in this category.</p>`;
            return;
        }

        listContainer.innerHTML = filtered.map(sub => {
            // ✅ THE FIX IS HERE: Added .toDate() to convert the Firestore timestamp
            const submittedDate = sub.submittedAt ? sub.submittedAt.toDate().toLocaleDateString() : 'N/A';
            const statusClass = `status-badge--${sub.status.replace('_', '-')}`;
            
            let actionsHTML = `<button class="action-btn btn-view" data-job-id="${sub.jobId}" data-submission-id="${sub.id}">View Proof</button>`;
            if (activeTab === 'pending' || activeTab === 'resubmit_pending') {
                actionsHTML += `<button class="action-btn btn-approve" data-job-id="${sub.jobId}" data-submission-id="${sub.id}">✔ Approve</button>`;
            }
            if (activeTab === 'pending') {
                 actionsHTML += `<button class="action-btn btn-reject" data-job-id="${sub.jobId}" data-submission-id="${sub.id}">✖ Reject</button>`;
            }

            let timerHTML = '';
            if (sub.status === 'pending' && sub.submittedAt) {
                timerHTML = `<div class="review-timer" data-submitted-at="${sub.submittedAt.toMillis()}">Calculating review time...</div>`;
            }

            return `
                <div class="submission-card">
                    <div class="card-header">
                        <a href="/client/job-details.html?id=${sub.jobId}" class="job-title-link">${sub.jobTitle || 'Job Title Not Found'}</a>
                        <span class="status-badge ${statusClass}">${sub.status.replace('_', ' ')}</span>
                    </div>
                    <div class="card-body">
                        <div class="info-item">
                            <i class="fas fa-user"></i> Worker ID: <strong>${sub.workerId.substring(0, 8)}...</strong>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-calendar-alt"></i> Submitted On: <strong>${submittedDate}</strong>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-sack-dollar"></i> Payout: <strong>৳${sub.payout || 0}</strong>
                        </div>
                    </div>
                    ${timerHTML ? `<div class="card-footer">${timerHTML}</div>` : ''}
                    <div class="card-actions">${actionsHTML}</div>
                </div>`;
        }).join('');

        if (activeTab === 'pending') {
            startClientReviewTimers();
        }
    };

    const startClientReviewTimers = () => {
        const timerElements = document.querySelectorAll('.review-timer');
        const autoApproveDuration = 24 * 60 * 60 * 1000;

        const update = () => {
            timerElements.forEach(timerEl => {
                const submittedAt = parseInt(timerEl.dataset.submittedAt, 10);
                if (!submittedAt) return;

                const deadline = submittedAt + autoApproveDuration;
                const now = Date.now();
                const diff = deadline - now;

                if (diff <= 0) {
                    timerEl.innerHTML = `<strong>Review time has expired</strong>`;
                    return;
                }
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                timerEl.innerHTML = `Auto-approves in: <strong>${hours}h ${minutes}m</strong>`;
            });
        };
        update();
        timerInterval = setInterval(update, 1000);
    };

    const listenToAllSubmissions = (clientId) => {
        const q = query(
            collectionGroup(db, 'submissions'), 
            where("clientId", "==", clientId), 
            orderBy("submittedAt", "desc")
        );
        onSnapshot(q, (snapshot) => {
            allSubmissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderTabs();
            renderList();
        }, (error) => {
            console.error("Error fetching all submissions:", error);
            listContainer.innerHTML = `<p class="empty-list-message">Could not load submissions. Please check Firestore console for required index.</p>`;
        });
    };
    
    const showSuccessModal = (message) => {
        if (successModal) {
            document.getElementById('success-modal-message').textContent = message;
            successModal.classList.add('is-visible');
        }
    };
    
    const showRejectionModal = (jobId, submissionId) => {
        currentActionInfo = { jobId, submissionId };
        if (rejectionModal) {
            document.getElementById('rejection-reason-textarea').value = '';
            document.getElementById('rejection-error-message').style.display = 'none';
            rejectionModal.classList.add('is-visible');
        }
    };

    const handleApproval = async (jobId, submissionId) => {
        try {
            const token = await currentUser.getIdToken();
            const response = await fetch('/.netlify/functions/approveSubmission', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId, submissionId })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to approve submission.');
            showSuccessModal("Submission approved successfully and payment sent!");
        } catch (error) {
            console.error("Approval process failed:", error);
            alert(`Error: ${error.message}`);
        }
    };

    const handleRejectionWithReason = async () => {
        const reason = document.getElementById('rejection-reason-textarea').value.trim();
        if (!reason) {
            document.getElementById('rejection-error-message').style.display = 'block';
            return;
        }
        
        const confirmBtn = document.getElementById('rejection-confirm-btn');
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Submitting...';

        try {
            const token = await currentUser.getIdToken();
            const { jobId, submissionId } = currentActionInfo;
            const response = await fetch('/.netlify/functions/requestResubmission', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId, submissionId, reason })
            });
            if (!response.ok) throw new Error('Failed to request resubmission.');
            rejectionModal.classList.remove('is-visible');
            showSuccessModal('Rejection reason submitted. The worker can now resubmit.');
        } catch (error) {
            console.error(error);
            alert('An error occurred. Please try again.');
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Submit Rejection';
        }
    };

    const showProofModal = async (jobId, submissionId) => {
        const proofModalTitle = document.getElementById('proof-modal-title');
        const proofModalBody = document.getElementById('proof-modal-body');
        const proofModalFooter = document.getElementById('proof-modal-footer');
        if (!proofModalTitle || !proofModalBody || !proofModalFooter) return;
        
        const submissionRef = doc(db, "jobs", jobId, "submissions", submissionId);
        const docSnap = await getDoc(submissionRef);
        if (!docSnap.exists()) {
            alert("Could not find submission details.");
            return;
        }
        
        const subData = docSnap.data();
        proofModalTitle.textContent = `Proof from ${subData.workerId.substring(0, 8)}`;
        let proofHTML = '';
        subData.proofs.forEach(proof => {
            proofHTML += `<div class="proof-item"><h5>${proof.instruction}</h5>`;
            if (proof.type === 'text' || proof.type === 'link') {
                proofHTML += `<p>${proof.answer}</p>`;
            } else if (proof.type === 'screenshot') {
                proofHTML += `<a href="${proof.answer}" target="_blank" rel="noopener noreferrer"><img src="${proof.answer}" alt="Proof Screenshot"></a>`;
            }
            proofHTML += `</div>`;
        });
        proofModalBody.innerHTML = proofHTML;
        proofModalFooter.innerHTML = `<button class="modal-btn modal-btn--cancel" id="proof-modal-close-btn">Close</button>`;
        
        if (subData.status === 'pending') {
            const approveBtn = document.createElement('button');
            approveBtn.className = 'modal-btn modal-btn--confirm';
            approveBtn.textContent = '✔ Approve';
            approveBtn.onclick = () => { handleApproval(jobId, submissionId); proofModal.classList.remove('is-visible'); };
            const rejectBtn = document.createElement('button');
            rejectBtn.className = 'modal-btn';
            rejectBtn.style.backgroundColor = '#EB5757';
            rejectBtn.style.color = 'white';
            rejectBtn.textContent = '✖ Reject';
            rejectBtn.onclick = () => { showRejectionModal(jobId, submissionId); proofModal.classList.remove('is-visible'); };
            proofModalFooter.appendChild(rejectBtn);
            proofModalFooter.appendChild(approveBtn);
        }

        proofModal.classList.add('is-visible');
    };

    // --- EVENT LISTENERS ---
    tabsContainer.addEventListener('click', e => {
        const tabButton = e.target.closest('.tab-btn');
        if (tabButton) {
            activeTab = tabButton.dataset.tab;
            renderTabs();
            renderList();
        }
    });

    listContainer.addEventListener('click', e => {
        const target = e.target.closest('button');
        if (!target) return;
        const submissionId = target.dataset.submissionId;
        const jobId = target.dataset.jobId;
        if (target.matches('.btn-approve')) handleApproval(jobId, submissionId);
        if (target.matches('.btn-reject')) showRejectionModal(jobId, submissionId);
        if (target.matches('.btn-view')) showProofModal(jobId, submissionId);
        if (target.matches('.copy-worker-id-btn')) {
            navigator.clipboard.writeText(target.dataset.workerId);
            const icon = target.querySelector('i');
            if (icon) {
                icon.className = 'fa-solid fa-check';
                setTimeout(() => { icon.className = 'fa-regular fa-copy'; }, 1500);
            }
        }
    });
    
    document.getElementById('success-modal-close-btn').addEventListener('click', () => successModal.classList.remove('is-visible'));
    document.getElementById('rejection-cancel-btn').addEventListener('click', () => rejectionModal.classList.remove('is-visible'));
    document.getElementById('rejection-confirm-btn').addEventListener('click', handleRejectionWithReason);
    document.addEventListener('click', e => {
        if(e.target === successModal) successModal.classList.remove('is-visible');
        if(e.target === rejectionModal) rejectionModal.classList.remove('is-visible');
        if(e.target === proofModal) proofModal.classList.remove('is-visible');
        const proofModalCloseBtn = document.getElementById('proof-modal-close-btn');
        if (proofModalCloseBtn && e.target === proofModalCloseBtn) {
            proofModal.classList.remove('is-visible');
        }
    });

    // --- INITIALIZATION ---
    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            renderHero();
            listenToAllSubmissions(user.uid);
        } else {
            window.location.href = '/login.html';
        }
    });
});