// === FILE: /worker/js/worker-submission-details.js (FINAL VERSION) ===

import { auth, db } from '/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {

const loadingContainer = document.getElementById('loading-container');
const detailsCard = document.getElementById('details-card'); // "cardContainer" -> "detailsCard"
    let countdownInterval;
    let currentUser;

    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('jobId');
    const submissionId = urlParams.get('submissionId');

    if (!jobId || !submissionId) {
        loadingContainer.innerHTML = `<h1 class="loading-title">Invalid Link</h1>`;
        return;
    }

    function showModal(type, title, message) {
        // ... (modal function is unchanged from previous version)
        const modalOverlay = document.getElementById('custom-notification-modal');
        if (!modalOverlay) return;
        if (!modalOverlay.dataset.listenersAttached) {
            const closeModal = () => modalOverlay.classList.remove('is-visible');
            modalOverlay.querySelector('.modal-btn-ok').addEventListener('click', closeModal);
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) closeModal();
            });
            modalOverlay.dataset.listenersAttached = 'true';
        }
        const modalIcon = modalOverlay.querySelector('.modal-icon');
        modalIcon.className = `modal-icon ${type}`;
        modalOverlay.querySelector('.modal-title').textContent = title;
        modalOverlay.querySelector('.modal-message').textContent = message;
        modalOverlay.classList.add('is-visible');
    }
    
    const startReviewTimer = (sub) => {
        if (countdownInterval) clearInterval(countdownInterval);
        const timerEl = document.getElementById(`review-timer-${submissionId}`);
        if (!timerEl || !sub.reviewBy) return;

        const deadline = sub.reviewBy.toDate();
        const updateTimer = () => {
            const now = new Date();
            const diff = deadline - now;
            if (diff <= 0) {
                clearInterval(countdownInterval);
                timerEl.innerHTML = `<strong>Awaiting Auto-Approval...</strong>`;
                return;
            }
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            timerEl.innerHTML = `Auto-approves in: <strong>${hours}h ${minutes}m</strong>`;
        };
        updateTimer();
        countdownInterval = setInterval(updateTimer, 60000);
    };

    const renderPageContent = (sub, job) => {
    const submittedDate = sub.submittedAt ? sub.submittedAt.toDate().toLocaleString() : 'N/A';
    const statusClass = `status-badge--${sub.status.split('_')[0]}`;
    const approvedCount = job.submissionsApproved || 0;
    const neededCount = job.workersNeeded || 1;
    const progress = neededCount > 0 ? (approvedCount / neededCount) * 100 : 0;
    const pendingCount = job.submissionsPending || 0;
    const rejectedCount = job.submissionsRejected || 0;

    const accordionHTML = `
        <div class="accordion">
            <button class="accordion-header active"><span>Task Instructions</span><i class="fa-solid fa-chevron-down"></i></button>
            <div class="accordion-content open" style="max-height: 500px;"><ul>${job.instructions.map(i => `<li>${i}</li>`).join('')}</ul></div>
        </div>
        <div class="accordion">
            <button class="accordion-header"><span>Task Rules</span><i class="fa-solid fa-chevron-down"></i></button>
            <div class="accordion-content"><ul>${job.restrictions.map(r => `<li>${r}</li>`).join('')}</ul></div>
        </div>
            <div class="accordion">
            <button class="accordion-header"><span>Required Proofs</span><i class="fa-solid fa-chevron-down"></i></button>
            <div class="accordion-content"><ul>${job.proofs.map(p => `<li>${p.instruction} <strong>(${p.type})</strong></li>`).join('')}</ul></div>
        </div>`;

    const proofsHTML = sub.proofs.map(proof => {
        let answerHTML = '';
        if (proof.type === 'screenshot') {
            answerHTML = `<a href="${proof.answer}" target="_blank" rel="noopener noreferrer"><img src="${proof.answer}" alt="Proof Screenshot"></a>`;
        } else if (proof.type === 'link') {
            answerHTML = `<a href="${proof.answer}" target="_blank" rel="noopener noreferrer">${proof.answer}</a>`;
        } else {
            answerHTML = `<p>${proof.answer}</p>`;
        }
        return `<div class="proof-item"><h4>${proof.instruction}</h4>${answerHTML}</div>`;
    }).join('');

    const submittedProofsHTML = `<div class="proofs-box"><h3>Your Submitted Proofs</h3>${proofsHTML}</div>`;
    
    // Timer is only created if the status is pending
    let timerHTML = '';
    if (sub.status === 'pending' || sub.status === 'resubmitted_pending') {
        timerHTML = `<div class="review-timer" id="review-timer-${submissionId}">Calculating...</div>`;
    }

    detailsCard.innerHTML = `
        <div class="overview-header">
            <h1 class="job-title">${job.title}</h1>
            <div class="job-id-container">
                <span id="task-id-text">ID: ${jobId}</span>
                <button class="copy-btn" id="copy-task-id" title="Copy Task ID"><i class="fa-solid fa-copy"></i></button>
            </div>
            <span class="job-category">${job.category}</span>
            <div class="submission-meta">
                <span class="status-badge ${statusClass}">${sub.status.replace('_', ' ')}</span>
                <p class="submitted-date">Submitted on: ${submittedDate}</p>
            </div>
        </div>
        
        ${timerHTML} 
        
        <div class="highlighted-payout">
            <i class="payout-icon fa-solid fa-hand-holding-dollar"></i>
            <div class="stat-text"><span class="stat-label">Task Payout</span><strong>৳${job.costPerWorker}</strong></div>
        </div>

        <div class="overview-stats-grid">
            <div class="stat-item"><i class="stat-icon fa-solid fa-users"></i><div class="stat-text"><span class="stat-label">Workers Filled</span><strong>${approvedCount}/${neededCount}</strong></div></div>
            <div class="stat-item"><i class="stat-icon fa-solid fa-calendar-day"></i><div class="stat-text"><span class="stat-label">Posted</span><strong>Just Now</strong></div></div>
            <div class="stat-item"><i class="stat-icon fa-solid fa-clock"></i><div class="stat-text"><span class="stat-label">Approval Time</span><strong>${job.approvalTime || '24 Hours'}</strong></div></div>
            <div class="stat-item"><i class="stat-icon fa-solid fa-check"></i><div class="stat-text"><span class="stat-label">Approved</span><strong>${approvedCount}</strong></div></div>
            <div class="stat-item"><i class="stat-icon fa-solid fa-times"></i><div class="stat-text"><span class="stat-label">Rejected</span><strong>${rejectedCount}</strong></div></div>
            <div class="stat-item"><i class="stat-icon fa-solid fa-hourglass-half"></i><div class="stat-text"><span class="stat-label">Pending</span><strong>${pendingCount}</strong></div></div>
            <div class="stat-item">
                <i class="stat-icon fa-solid fa-id-badge"></i>
                <div class="stat-text">
                    <span class="stat-label">Client ID</span>
                    <strong>${job.clientId.substring(0, 8)}... <button class="copy-btn" id="copy-client-id" title="Copy Client ID"><i class="fa-solid fa-copy"></i></button></strong>
                </div>
            </div>
            <a href="/worker/client-profile.html?id=${job.clientId}" class="stat-item clickable">
                <i class="stat-icon fa-solid fa-user-circle"></i>
                <div class="stat-text"><span class="stat-label">Client Profile</span><strong>View Profile</strong></div>
            </a>
        </div>
        
        <div class="overview-progress">
            <div class="progress-labels"><span>Completion</span><strong>${progress.toFixed(0)}%</strong></div>
            <div class="progress-bar"><div class="progress-bar__fill" style="width: ${progress.toFixed(2)}%;"></div></div>
        </div>

        <div class="card-body-layout">
            <div class="job-information-column">${accordionHTML}</div>
            <div class="job-action-column">${submittedProofsHTML}</div>
        </div>
    `;

    startReviewTimer({id: submissionId, ...sub});
    addEventListeners(job);
};

    function addEventListeners(job) {
        const accordionHeaders = detailsCard.querySelectorAll('.accordion-header');
        accordionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                header.classList.toggle('active');
                const content = header.nextElementSibling;
                content.classList.toggle('open');
                if (content.style.maxHeight) { content.style.maxHeight = null; } 
                else { content.style.maxHeight = content.scrollHeight + 'px'; }
            });
        });
        document.getElementById('copy-task-id').addEventListener('click', () => {
            navigator.clipboard.writeText(jobId).then(() => { showModal('success', 'Copied!', 'Task ID copied!'); });
        });
        document.getElementById('copy-client-id').addEventListener('click', () => {
            navigator.clipboard.writeText(job.clientId).then(() => { showModal('success', 'Copied!', 'Client ID copied!'); });
        });
    }

    const loadDetails = async (userId) => {
        try {
            const submissionRef = doc(db, "jobs", jobId, "submissions", submissionId);
            const jobRef = doc(db, "jobs", jobId);

            const [subSnap, jobSnap] = await Promise.all([ getDoc(submissionRef), getDoc(jobRef) ]);
            if (!subSnap.exists() || !jobSnap.exists()) throw new Error("Submission or Job not found.");

            const subData = subSnap.data();
            if (subData.workerId !== userId) throw new Error("You do not have permission to view this submission.");
            
            renderPageContent(subData, jobSnap.data());
            
            loadingContainer.style.display = 'none';
            detailsCard.style.display = 'block';

        } catch (error) {
            console.error("Error loading details:", error);
            loadingContainer.innerHTML = `<h1 class="loading-title">${error.message}</h1>`;
        }
    };

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            loadDetails(user.uid);
        } else {
            window.location.href = '/login.html';
        }
    });
});