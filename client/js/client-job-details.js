// FILE: /client/js/client-job-details.js (FINAL - ACCORDION MOVED)

import { auth, db } from '/js/firebase-config.js';
import { doc, onSnapshot, collection, query, updateDoc, getDoc, runTransaction, increment, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {
    // --- DOM Elements ---
    const jobDetailsContainer = document.getElementById('job-details-content');
    const submissionManagerSection = document.getElementById('submission-manager-section');
    // 'originalInfoSection' is no longer needed as a separate container
    
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');

    if (!jobId) {
        jobDetailsContainer.innerHTML = `<h1 class="loading-title">Job Not Found</h1>`;
        return;
    }

    // --- RENDER FUNCTION ---
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
        
        // Accordion content is now generated here
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
                        <div class="stat-item">
                            <span class="stat-label"><i class="stat-icon fa-solid fa-users"></i> Workers Filled</span>
                            <span class="stat-value">${approvedCount} / ${neededCount}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label"><i class="stat-icon fa-solid fa-check"></i> Approved Submissions</span>
                            <span class="stat-value">${approvedCount}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label"><i class="stat-icon fa-solid fa-hourglass-half"></i> Pending Submissions</span>
                            <span class="stat-value">${pendingCount}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label"><i class="stat-icon fa-solid fa-times"></i> Rejected Submissions</span>
                            <span class="stat-value">${rejectedCount}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label"><i class="stat-icon fa-solid fa-coins"></i> Total Budget</span>
                            <span class="stat-value">৳${job.totalCost.toLocaleString()}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label"><i class="stat-icon fa-solid fa-hand-holding-dollar"></i> Cost Per Worker</span>
                            <span class="stat-value">৳${job.costPerWorker.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div class="overview-progress">
                        <div class="progress-labels">
                            <span>Completion</span>
                            <strong>${progress.toFixed(0)}%</strong>
                        </div>
                        <div class="progress-bar"><div class="progress-bar__fill" style="width: ${progress.toFixed(2)}%;"></div></div>
                    </div>

                    <div class="accordion-container">
                        <div class="accordion">
                            <button class="accordion-header">
                                <span>Original Job Information</span><i class="fa-solid fa-chevron-down"></i>
                            </button>
                            <div class="accordion-content">
                                <div class="info-section"><h4>Instructions</h4><ul>${instructionsHTML}</ul></div>
                                <div class="info-section"><h4>Rules</h4><ul>${restrictionsHTML}</ul></div>
                                <div class="info-section"><h4>Proof Required</h4><ul>${proofsHTML}</ul></div>
                            </div>
                        </div>
                    </div>

                    <div class="overview-actions">
                        ${actionButtonsHTML}
                    </div>
                </div>
            </div>`;
    }

    function renderSubmissions(submissions, activeTab = 'pending') {
        submissionManagerSection.innerHTML = `
            <div class="block">
                <div class="submission-manager">
                    <nav class="tabs-nav">
                        <button class="tab-btn ${activeTab === 'pending' ? 'active' : ''}" data-tab="pending">Pending Review <span class="count-badge">${submissions.pending.length}</span></button>
                        <button class="tab-btn ${activeTab === 'approved' ? 'active' : ''}" data-tab="approved">Approved <span class="count-badge">${submissions.approved.length}</span></button>
                        <button class="tab-btn ${activeTab === 'rejected' ? 'active' : ''}" data-tab="rejected">Rejected <span class="count-badge">${submissions.rejected.length}</span></button>
                    </nav>
                    <div class="tab-content"></div>
                </div>
            </div>`;
        renderTabContent(activeTab, submissions);
    }

    function renderTabContent(status, submissions) {
        const contentContainer = submissionManagerSection.querySelector('.tab-content');
        const subsToRender = submissions[status] || [];
        if (!contentContainer) return;
        
        if (subsToRender.length === 0) {
            contentContainer.innerHTML = `<p class="empty-list-message">No submissions in this category.</p>`;
            return;
        }

        contentContainer.innerHTML = subsToRender.map(sub => `
            <div class="submission-card">
                <div class="submission-info">
                    <strong>Freelancer ID:</strong> ${sub.freelancerId.substring(0, 8)}...
                    <span>Submitted: ${sub.submittedAt.toDate().toLocaleString()}</span>
                </div>
                <div class="submission-actions" data-submission-id="${sub.id}">
                    <button class="action-btn btn-view">View Proof</button>
                    ${status === 'pending' ? `
                        <button class="action-btn btn-approve">✔ Approve</button>
                        <button class="action-btn btn-reject">✖ Reject</button>
                    ` : ''}
                </div>
            </div>`).join('');
    }

    // --- DATA LISTENERS ---
    onSnapshot(doc(db, "jobs", jobId), (docSnap) => {
        if (docSnap.exists()) {
            renderPage({ id: docSnap.id, ...docSnap.data() });
        } else {
            jobDetailsContainer.innerHTML = `<h1 class="loading-title">Job Not Found</h1>`;
        }
    });

    onSnapshot(query(collection(db, "jobs", jobId, "submissions"), orderBy("submittedAt", "desc")), (snapshot) => {
        const submissions = { pending: [], approved: [], rejected: [] };
        snapshot.forEach(doc => {
            const sub = { id: doc.id, ...doc.data() };
            if (submissions[sub.status]) {
                submissions[sub.status].push(sub);
            }
        });
        const activeTab = submissionManagerSection.querySelector('.tab-btn.active')?.dataset.tab || 'pending';
        renderSubmissions(submissions, activeTab);
    });

    // --- HELPER FUNCTIONS ---
    async function updateJobStatus(id, newStatus) {
        const jobRef = doc(db, "jobs", id);
        try {
            await updateDoc(jobRef, { status: newStatus });
        } catch (error) {
            console.error("Failed to update job status:", error);
            alert("Error updating job status.");
        }
    }

    async function handleApproval(submissionId) {
        const jobRef = doc(db, "jobs", jobId);
        const submissionRef = doc(db, "jobs", jobId, "submissions", submissionId);
        try {
            await runTransaction(db, async (transaction) => {
                const jobDoc = await transaction.get(jobRef);
                const submissionDoc = await transaction.get(submissionRef);
                if (!jobDoc.exists() || !submissionDoc.exists()) throw new Error("Job or submission not found.");
                if (submissionDoc.data().status !== 'pending') throw new Error("Submission already processed.");
                
                transaction.update(submissionRef, { status: 'approved' });
                transaction.update(jobRef, {
                    submissionsApproved: increment(1),
                    submissionsPending: increment(-1)
                });
            });
            alert("Submission approved successfully!");
        } catch (error) {
            console.error("Approval transaction failed: ", error);
            alert(`Error: ${error.message}`);
        }
    }
    
    async function handleRejection(submissionId) {
        const jobRef = doc(db, "jobs", jobId);
        const submissionRef = doc(db, "jobs", jobId, "submissions", submissionId);
        try {
            await runTransaction(db, async (transaction) => {
                const submissionDoc = await transaction.get(submissionRef);
                if (!submissionDoc.exists()) throw new Error("Submission not found.");
                if (submissionDoc.data().status !== 'pending') throw new Error("Submission already processed.");

                transaction.update(submissionRef, { status: 'rejected' });
                transaction.update(jobRef, {
                    submissionsRejected: increment(1),
                    submissionsPending: increment(-1)
                });
            });
            alert("Submission rejected.");
        } catch (error) {
            console.error("Rejection failed: ", error);
            alert(`Error: ${error.message}`);
        }
    }

    async function showProofModal(submissionId) {
        const proofModal = document.getElementById('proof-modal');
        const proofModalBody = document.getElementById('proof-modal-body');
        const proofModalFooter = document.getElementById('proof-modal-footer');
        const proofModalTitle = document.getElementById('proof-modal-title');
        
        const submissionRef = doc(db, "jobs", jobId, "submissions", submissionId);
        const docSnap = await getDoc(submissionRef);
        if (!docSnap.exists()) {
            alert("Could not find submission details.");
            return;
        }

        const subData = docSnap.data();
        proofModalTitle.textContent = `Proof from ${subData.freelancerId.substring(0, 8)}`;
        
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

        proofModalFooter.innerHTML = `<button class="modal-btn modal-btn--cancel" id="proof-modal-close-footer">Close</button>`;
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
            rejectBtn.onclick = () => { handleRejection(submissionId); proofModal.classList.remove('is-visible'); };

            proofModalFooter.appendChild(rejectBtn);
            proofModalFooter.appendChild(approveBtn);
        }

        proofModal.classList.add('is-visible');
    }

    // --- EVENT LISTENERS ---
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = '/login.html';
        }
    });

    document.addEventListener('click', (e) => {
        const target = e.target;
        
        const actionButton = target.closest('.job-action-btn');
        if (actionButton) {
            if (actionButton.id === 'pause-job-btn') updateJobStatus(jobId, 'paused');
            if (actionButton.id === 'resume-job-btn') updateJobStatus(jobId, 'open');
            if (actionButton.id === 'cancel-job-btn') {
                document.getElementById('cancel-job-modal')?.classList.add('is-visible');
            }
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
            const tabsNav = tabButton.closest('.tabs-nav');
            if (tabsNav && tabsNav.querySelector('.active')) {
                tabsNav.querySelector('.active').classList.remove('active');
            }
            tabButton.classList.add('active');
        }

        const submissionActions = target.closest('.submission-actions');
        if (submissionActions) {
            const submissionId = submissionActions.dataset.submissionId;
            if (target.matches('.btn-view')) showProofModal(submissionId);
            if (target.matches('.btn-approve')) handleApproval(submissionId);
            if (target.matches('.btn-reject')) handleRejection(submissionId);
        }

        if (target.id === 'cancel-modal-close-btn') {
            document.getElementById('cancel-job-modal')?.classList.remove('is-visible');
        }
        if (target.id === 'cancel-modal-confirm-btn') {
            updateJobStatus(jobId, 'cancelled');
            document.getElementById('cancel-job-modal')?.classList.remove('is-visible');
        }
        if (target.id === 'proof-modal' || target.id === 'proof-modal-close-footer') {
            document.getElementById('proof-modal')?.classList.remove('is-visible');
        }
    });
});