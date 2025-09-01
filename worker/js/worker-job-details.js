// === FILE: /worker/js/worker-task-details.js (FINAL VERSION) ===

import { auth, db } from '/js/firebase-config.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {
    
    const loadingContainer = document.getElementById('loading-container');
    const cardContainer = document.getElementById('task-details-card');
    const stickyFooter = document.getElementById('sticky-footer');
    
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');

    function showModal(type, title, message) {
        let modalOverlay = document.getElementById('custom-notification-modal');
        if (!modalOverlay) {
            modalOverlay = document.createElement('div');
            modalOverlay.id = 'custom-notification-modal';
            modalOverlay.className = 'modal-overlay';
            modalOverlay.innerHTML = `
                <div class="modal-content">
                    <div class="modal-icon"></div>
                    <h3 class="modal-title"></h3>
                    <p class="modal-message"></p>
                    <button class="modal-btn-ok">OK</button>
                </div>
            `;
            document.body.appendChild(modalOverlay);
            const closeModal = () => modalOverlay.classList.remove('is-visible');
            modalOverlay.querySelector('.modal-btn-ok').addEventListener('click', closeModal);
            modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
        }
        const modalIcon = modalOverlay.querySelector('.modal-icon');
        modalIcon.className = `modal-icon ${type}`;
        modalOverlay.querySelector('.modal-title').textContent = title;
        modalOverlay.querySelector('.modal-message').textContent = message;
        modalOverlay.classList.add('is-visible');
    }

    // --- RENDER FUNCTION ---
    const renderPageContent = (job) => {
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
        
        const warningBoxHTML = `
            <div class="warning-box">
                <i class="warning-icon fa-solid fa-triangle-exclamation"></i>
                <div class="warning-text">
                    <h4>Please Note</h4>
                    <p>Before starting, please carefully review all instructions, rules, and proof requirements. Failure to comply may result in a permanent account ban.</p>
                </div>
            </div>
        `;
        
        const actionButtonHTML = `<a href="/worker/task-submission.html?id=${jobId}" class="btn-submit">Start Task & Submit Proof</a>`;

        cardContainer.innerHTML = `
            <div class="overview-header">
                <h1 class="job-title">${job.title}</h1>
                <div class="job-id-container">
                    <span id="task-id-text">ID: ${jobId}</span>
                    <button class="copy-btn" id="copy-task-id" title="Copy Task ID"><i class="fa-solid fa-copy"></i></button>
                </div>
                <span class="job-category">${job.category}</span>
            </div>
            <div class="highlighted-payout">
                <i class="payout-icon fa-solid fa-hand-holding-dollar"></i>
                <div class="stat-text">
                    <span class="stat-label">Task Payout</span>
                    <strong>৳${job.costPerWorker}</strong>
                </div>
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
                <a href="/profile.html?id=${job.clientId}" class="stat-item clickable">
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
                <div class="job-action-column">${warningBoxHTML}</div>
            </div>
        `;

        stickyFooter.innerHTML = actionButtonHTML;
        
        addEventListeners(job);
    };

    function addEventListeners(job) {
        const accordionHeaders = cardContainer.querySelectorAll('.accordion-header');
        accordionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                header.classList.toggle('active');
                const content = header.nextElementSibling;
                content.classList.toggle('open');
                if (content.style.maxHeight) {
                    content.style.maxHeight = null;
                } else {
                    content.style.maxHeight = content.scrollHeight + 'px';
                }
            });
        });
        document.getElementById('copy-task-id').addEventListener('click', () => {
            navigator.clipboard.writeText(jobId).then(() => {
                showModal('success', 'Copied!', 'Task ID has been copied to your clipboard.');
            }).catch(() => { showModal('error', 'Failed', 'Could not copy Task ID.'); });
        });
        document.getElementById('copy-client-id').addEventListener('click', () => {
            navigator.clipboard.writeText(job.clientId).then(() => {
                showModal('success', 'Copied!', 'Client ID has been copied to your clipboard.');
            }).catch(() => { showModal('error', 'Failed', 'Could not copy Client ID.'); });
        });
    }
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            onSnapshot(doc(db, "jobs", jobId), (docSnap) => {
                if (docSnap.exists()) {
                    renderPageContent(docSnap.data());
                    loadingContainer.style.display = 'none';
                    cardContainer.style.display = 'block';
                    stickyFooter.style.display = 'block';
                } else {
                    loadingContainer.innerHTML = `<h1 class="loading-title">Job Not Found</h1>`;
                }
            });
        } else { window.location.href = '/login.html'; }
    });
});