// FILE: /client/js/client-job-details.js (FINAL & COMPLETE)

import { auth, db } from '/js/firebase-config.js';
import { doc, onSnapshot, collection, query, updateDoc, getDoc, runTransaction, increment, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {
    // --- DOM Elements & State ---
    const jobDetailsContainer = document.getElementById('job-details-content');
    const submissionManagerSection = document.getElementById('submission-manager-section');
    const successModal = document.getElementById('success-modal');
    const rejectionModal = document.getElementById('rejection-modal');
    const proofModal = document.getElementById('proof-modal');
    
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');
    
    let allSubmissions = { pending: [], approved: [], rejected: [], resubmit_pending: [] };
    let timerInterval = null;
    let currentSubmissionId = null; 

    if (!jobId) {
        jobDetailsContainer.innerHTML = `<h1 class="loading-title">Job Not Found</h1>`;
        return;
    }

    // --- RENDER FUNCTIONS ---
    function renderPage(job) {
        const statusText = job.status.replace('_', ' ');
        const approvedCount = job.submissionsApproved || 0;
        const rejectedCount = job.submissionsRejected || 0;
        const pendingCount = job.submissionsPending || 0;
        const neededCount = job.workersNeeded || 1;
        const progress = neededCount > 0 ? (approvedCount / neededCount) * 100 : 0;
        
        let actionButtonsHTML = '';
        if (job.status === 'open' || job.status === 'active') {
            actionButtonsHTML += `<button class="job-action-btn primary" id="pause-job-btn"><i class="fa-solid fa-pause"></i> Pause Job</button>`;
        } else if (job.status === 'paused') {
            actionButtonsHTML += `<button class="job-action-btn primary" id="resume-job-btn"><i class="fa-solid fa-play"></i> Resume Job</button>`;
        }
        if (job.status === 'open' || job.status === 'active' || job.status === 'paused') {
             actionButtonsHTML += `<button class="job-action-btn outline" id="cancel-job-btn"><i class="fa-solid fa-ban"></i> Cancel Job</button>`;
        }
        
        const instructionsHTML = job.instructions.map(i => `<li>${i}</li>`).join('');
        const restrictionsHTML = job.restrictions.map(r => `<li>${r}</li>`).join('');
        const proofsHTML = job.proofs.map(p => `<li>${p.instruction} <strong>(${p.type})</strong></li>`).join('');

        jobDetailsContainer.innerHTML = `
            <div class="block">
                <div class="job-overview-card">
                    <div class="overview-header">
                        <h1 class="job-title">${job.title}</h1>
                        <p class="job-id">ID: ${job.id}</p>
                        <span class="status-badge ${job.status}">${statusText}</span>
                    </div>
                    <div class="overview-stats">
                        <div class="stat-item"><span class="stat-label"><i class="stat-icon fa-solid fa-users"></i> Workers Filled</span><span class="stat-value">${approvedCount} / ${neededCount}</span></div>
                        <div class="stat-item"><span class="stat-label"><i class="stat-icon fa-solid fa-check"></i> Approved Submissions</span><span class="stat-value">${approvedCount}</span></div>
                        <div class="stat-item"><span class="stat-label"><i class="stat-icon fa-solid fa-hourglass-half"></i> Pending Submissions</span><span class="stat-value">${pendingCount}</span></div>
                        <div class="stat-item"><span class="stat-label"><i class="stat-icon fa-solid fa-times"></i> Rejected Submissions</span><span class="stat-value">${rejectedCount}</span></div>
                        <div class="stat-item"><span class="stat-label"><i class="stat-icon fa-solid fa-coins"></i> Total Budget</span><span class="stat-value">৳${job.totalCost.toLocaleString()}</span></div>
                        <div class="stat-item"><span class="stat-label"><i class="stat-icon fa-solid fa-hand-holding-dollar"></i> Cost Per Worker</span><span class="stat-value">৳${job.costPerWorker.toLocaleString()}</span></div>
                    </div>
                    <div class="overview-progress">
                        <div class="progress-labels"><span>Completion</span><strong>${progress.toFixed(0)}%</strong></div>
                        <div class="progress-bar"><div class="progress-bar__fill" style="width: ${progress.toFixed(2)}%;"></div></div>
                    </div>
                    <div class="accordion-container">
                        <div class="accordion">
                            <button class="accordion-header"><span>Original Job Information</span><i class="fa-solid fa-chevron-down"></i></button>
                            <div class="accordion-content">
                                <div class="info-section"><h4>Instructions</h4><ul>${instructionsHTML}</ul></div>
                                <div class="info-section"><h4>Rules</h4><ul>${restrictionsHTML}</ul></div>
                                <div class="info-section"><h4>Proof Required</h4><ul>${proofsHTML}</ul></div>
                            </div>
                        </div>
                    </div>
                    <div class="overview-actions">${actionButtonsHTML}</div>
                </div>
            </div>`;
    }

    function renderSubmissions(activeTab = 'pending') {
        submissionManagerSection.innerHTML = `
            <div class="block">
                <div class="submission-manager">
                    <nav class="tabs-nav">
                        <button class="tab-btn ${activeTab === 'pending' ? 'active' : ''}" data-tab="pending">Pending Review <span class="count-badge">${allSubmissions.pending.length}</span></button>
                        <button class="tab-btn ${activeTab === 'resubmit_pending' ? 'active' : ''}" data-tab="resubmit_pending">Awaiting Resubmission <span class="count-badge">${allSubmissions.resubmit_pending.length}</span></button>
                        <button class="tab-btn ${activeTab === 'approved' ? 'active' : ''}" data-tab="approved">Approved <span class="count-badge">${allSubmissions.approved.length}</span></button>
                        <button class="tab-btn ${activeTab === 'rejected' ? 'active' : ''}" data-tab="rejected">Rejected <span class="count-badge">${allSubmissions.rejected.length}</span></button>
                    </nav>
                    <div class="tab-content"></div>
                </div>
            </div>`;
        renderTabContent(activeTab);
    }

    function renderTabContent(status) {
        const contentContainer = submissionManagerSection.querySelector('.tab-content');
        const subsToRender = allSubmissions[status] || [];
        if (!contentContainer) return;
        
        if (subsToRender.length === 0) {
            contentContainer.innerHTML = `<p class="empty-list-message">No submissions in this category.</p>`;
            return;
        }

        contentContainer.innerHTML = subsToRender.map(sub => {
            let cardContent = '';
            
            const commonInfoHTML = `
                <div class="worker-info">
                    <strong>Worker ID:</strong> ${sub.workerId.substring(0, 8)}...
                    <button class="copy-worker-id-btn" data-worker-id="${sub.workerId}" title="Copy ID"><i class="fa-regular fa-copy"></i></button>
                </div>
                <span>Submitted: ${sub.submittedAt.toDate().toLocaleString()}</span>`;

            if (status === 'pending') {
                const submittedAtTimestamp = sub.submittedAt.toMillis();
                cardContent = `
                    <div class="submission-info">
                        ${commonInfoHTML}
                        <div class="submission-timer" data-submitted-at="${submittedAtTimestamp}">
                            <i class="fa-solid fa-clock"></i> <span>Calculating...</span>
                        </div>
                    </div>
                    <div class="submission-actions" data-submission-id="${sub.id}">
                        <button class="action-btn btn-view">View Proof</button>
                        <button class="action-btn btn-approve">✔ Approve</button>
                        <button class="action-btn btn-reject">✖ Reject</button>
                    </div>`;
            } else if (status === 'resubmit_pending') {
                const rejectionTimestamp = sub.rejectionTimestamp.toMillis();
                cardContent = `
                    <div class="submission-info">
                        ${commonInfoHTML}
                        <div class="resubmit-card-info">
                            <p><strong>Reason Sent:</strong> ${sub.rejectionReason}</p>
                            <p class="worker-resubmit-timer" data-rejection-timestamp="${rejectionTimestamp}">
                                <i class="fa-solid fa-hourglass-half"></i> <span>Calculating worker's deadline...</span>
                            </p>
                        </div>
                    </div>
                    <div class="submission-actions" data-submission-id="${sub.id}">
                        <button class="action-btn btn-view">View Proof</button>
                    </div>`;
            } else { // For approved and rejected
                cardContent = `
                    <div class="submission-info">${commonInfoHTML}</div>
                    <div class="submission-actions" data-submission-id="${sub.id}">
                        <button class="action-btn btn-view">View Proof</button>
                    </div>`;
            }
            
            return `<div class="submission-card">${cardContent}</div>`;
        }).join('');
        
        if (timerInterval) clearInterval(timerInterval);
        if (status === 'pending') {
            startClientReviewTimers();
        } else if (status === 'resubmit_pending') {
            startWorkerResubmitTimers();
        }
    }

    function startWorkerResubmitTimers() {
        const timerElements = document.querySelectorAll('.worker-resubmit-timer');
        const resubmitDuration = 12 * 60 * 60 * 1000; // 12 hours

        const update = () => {
            const now = Date.now();
            timerElements.forEach(el => {
                const rejectionTimestamp = parseInt(el.dataset.rejectionTimestamp, 10);
                const deadline = rejectionTimestamp + resubmitDuration;
                const timeLeft = deadline - now;
                const span = el.querySelector('span');

                if (timeLeft > 0) {
                    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                    const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
                    span.textContent = `Worker has ${hours}h ${minutes}m to resubmit.`;
                } else {
                    span.textContent = "Worker's time to resubmit has expired.";
                    el.classList.add('expired');
                }
            });
        };
        update();
        timerInterval = setInterval(update, 1000);
    }
    
    function startClientReviewTimers() {
        const timerElements = document.querySelectorAll('.submission-timer');
        const autoApproveDuration = 24 * 60 * 60 * 1000; // 24 hours

        const update = () => {
            const now = Date.now();
            timerElements.forEach(el => {
                const submittedAt = parseInt(el.dataset.submittedAt, 10);
                const deadline = submittedAt + autoApproveDuration;
                const timeLeft = deadline - now;
                const span = el.querySelector('span');

                if (timeLeft > 0) {
                    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                    const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
                    span.textContent = `Auto-approves in: ${hours}h ${minutes}m`;
                } else {
                    span.textContent = "Time expired. Awaiting auto-approval.";
                    el.classList.add('expired');
                }
            });
        };
        update();
        timerInterval = setInterval(update, 1000);
    }
    
    // --- ✅ ALL HELPER FUNCTIONS MUST BE DEFINED HERE ---

    function showSuccessModal(message) {
        if (successModal) {
            document.getElementById('success-modal-message').textContent = message;
            successModal.classList.add('is-visible');
        }
    }

    function showRejectionModal(submissionId) {
        currentSubmissionId = submissionId;
        if (rejectionModal) {
            document.getElementById('rejection-reason-textarea').value = '';
            document.getElementById('rejection-error-message').style.display = 'none';
            rejectionModal.classList.add('is-visible');
        }
    }

    async function handleApproval(submissionId) {
        try {
            const token = await auth.currentUser.getIdToken();
            const response = await fetch('/.netlify/functions/approveSubmission', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId: jobId, submissionId: submissionId })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to approve submission.');
            }
            
            showSuccessModal("Submission approved successfully and payment sent!");

        } catch (error) {
            console.error("Approval process failed:", error);
            alert(`Error: ${error.message}`);
        }
    }

    async function handleRejectionWithReason() {
        const reasonTextarea = document.getElementById('rejection-reason-textarea');
        const reason = reasonTextarea.value.trim();
        const errorP = document.getElementById('rejection-error-message');

        if (!reason) {
            errorP.style.display = 'block';
            return;
        }
        errorP.style.display = 'none';

        const confirmBtn = document.getElementById('rejection-confirm-btn');
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Submitting...';

        try {
            const token = await auth.currentUser.getIdToken();
            const response = await fetch('/.netlify/functions/requestResubmission', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId: jobId, submissionId: currentSubmissionId, reason: reason })
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
    }
    
    async function showProofModal(submissionId) {
        const proofModalTitle = document.getElementById('proof-modal-title');
        const proofModalBody = document.getElementById('proof-modal-body');
        const proofModalFooter = document.getElementById('proof-modal-footer');
        if (!proofModalTitle || !proofModalBody || !proofModalFooter) {
            console.error('Proof modal elements not found in the HTML.');
            return;
        }
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
            approveBtn.onclick = () => { handleApproval(submissionId); proofModal.classList.remove('is-visible'); };
            const rejectBtn = document.createElement('button');
            rejectBtn.className = 'modal-btn';
            rejectBtn.style.backgroundColor = '#EB5757';
            rejectBtn.style.color = 'white';
            rejectBtn.textContent = '✖ Reject';
            rejectBtn.onclick = () => { showRejectionModal(submissionId); proofModal.classList.remove('is-visible'); };
            proofModalFooter.appendChild(rejectBtn);
            proofModalFooter.appendChild(approveBtn);
        }
        proofModal.classList.add('is-visible');
    }

    // --- DATA LISTENERS ---
    onSnapshot(doc(db, "jobs", jobId), (docSnap) => {
        if (docSnap.exists()) {
            renderPage({ id: docSnap.id, ...docSnap.data() });
        } else {
            jobDetailsContainer.innerHTML = `<h1 class="loading-title">Job Not Found</h1>`;
        }
    });
    
    const submissionsQuery = query(collection(db, "jobs", jobId, "submissions"), orderBy("submittedAt", "desc"));
    onSnapshot(submissionsQuery, (snapshot) => {
        const subs = { pending: [], approved: [], rejected: [], resubmit_pending: [] };
        snapshot.forEach(doc => {
            const sub = { id: doc.id, ...doc.data() };
            if (subs[sub.status]) {
                subs[sub.status].push(sub);
            }
        });
        
        allSubmissions = subs;
        const activeTab = submissionManagerSection.querySelector('.tab-btn.active')?.dataset.tab || 'pending';
        renderSubmissions(activeTab);
    }, (error) => {
        console.error("Error fetching submissions: ", error);
        submissionManagerSection.innerHTML = `<p class="empty-list-message">Could not load submissions.</p>`;
    });

    // --- EVENT LISTENERS ---
    onAuthStateChanged(auth, (user) => {
        if (!user) { window.location.href = '/login.html'; }
    });

    document.addEventListener('click', (e) => {
        const target = e.target;
        if (target.id === 'success-modal-close-btn' || (target.closest('.modal-overlay') === successModal && !target.closest('.modal-content'))) {
            successModal.classList.remove('is-visible');
        }
        if (target.id === 'rejection-cancel-btn' || (target.closest('.modal-overlay') === rejectionModal && !target.closest('.modal-content'))) {
            rejectionModal.classList.remove('is-visible');
        }
        if (target.id === 'proof-modal-close-btn' || (target.closest('.modal-overlay') === proofModal && !target.closest('.modal-content'))) {
            proofModal.classList.remove('is-visible');
        }
        if (target.id === 'rejection-confirm-btn') {
            handleRejectionWithReason();
        }
        const copyBtn = target.closest('.copy-worker-id-btn');
        if (copyBtn) {
            const workerId = copyBtn.dataset.workerId;
            navigator.clipboard.writeText(workerId).then(() => {
                const icon = copyBtn.querySelector('i');
                icon.className = 'fa-solid fa-check';
                copyBtn.classList.add('copied');
                setTimeout(() => { icon.className = 'fa-regular fa-copy'; copyBtn.classList.remove('copied'); }, 2000);
            }).catch(err => console.error('Failed to copy ID: ', err));
        }
        const actionButton = target.closest('.job-action-btn');
        if (actionButton) {
            // Placeholder for actions like pause/cancel
        }
        const accordionHeader = target.closest('.accordion-header');
        if (accordionHeader) {
            accordionHeader.classList.toggle('active');
            const content = accordionHeader.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
                content.classList.remove('open');
            } else {
                content.classList.add('open');
                content.style.maxHeight = content.scrollHeight + "px";
            }
        }
        const tabButton = target.closest('.tab-btn');
        if (tabButton) {
            if (timerInterval) clearInterval(timerInterval);
            const newActiveTab = tabButton.dataset.tab;
            const tabsNav = tabButton.closest('.tabs-nav');
            if(tabsNav){ tabsNav.querySelector('.active')?.classList.remove('active'); }
            tabButton.classList.add('active');
            renderTabContent(newActiveTab);
        }
        const submissionActions = target.closest('.submission-actions');
        if (submissionActions) {
            const submissionId = submissionActions.dataset.submissionId;
            if (target.matches('.btn-view')) showProofModal(submissionId);
            if (target.matches('.btn-approve')) handleApproval(submissionId);
            if (target.matches('.btn-reject')) showRejectionModal(submissionId);
        }
    });
});