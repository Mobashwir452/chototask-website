// FILE: /worker/js/worker-task-resubmission.js (FINAL & CORRECTED)

import { auth, db } from '/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const IMGBB_API_KEY = '2b154785f011c31f9c3b3a7ebae0f082';

document.addEventListener('componentsLoaded', () => {
    // --- DOM Elements ---
    const loadingContainer = document.getElementById('loading-container');
    const submissionCard = document.getElementById('submission-card');
    const headerContainer = document.getElementById('card-header-container');
    const guidanceContainer = document.getElementById('submission-guidance');
    const proofFormContainer = document.getElementById('proof-form-container');
    const rejectionInfoContainer = document.getElementById('rejection-info-container');

    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('jobId');
    const submissionId = urlParams.get('submissionId');
    let currentUser;

    if (!jobId || !submissionId) {
        loadingContainer.innerHTML = `<h1 class="loading-title">Invalid Link</h1>`;
        return;
    }

    // --- Custom Modal Function ---
    function showModal(type, title, message) {
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
        modalOverlay.querySelector('.modal-icon').className = `modal-icon ${type}`;
        modalOverlay.querySelector('.modal-title').textContent = title;
        modalOverlay.querySelector('.modal-message').textContent = message;
        modalOverlay.classList.add('is-visible');
    }
    
    // --- RENDER FUNCTIONS ---
    const renderHeader = (job) => {
        headerContainer.innerHTML = `
            <div class="submission-header">
                <a href="/worker/job-details.html?id=${jobId}" class="back-btn"><i class="fa-solid fa-arrow-left"></i> Back to Task Details</a>
                <div class="task-payout"><strong>৳${job.costPerWorker}</strong></div>
            </div>`;
    };

    const renderGuidance = (job) => {
        guidanceContainer.innerHTML = `
            <div class="accordion"><button class="accordion-header active"><span>Instructions</span><i class="fa-solid fa-chevron-down"></i></button><div class="accordion-content open" style="max-height: 500px;"><ul>${job.instructions.map(i => `<li>${i}</li>`).join('')}</ul></div></div>
            <div class="accordion"><button class="accordion-header"><span>Rules</span><i class="fa-solid fa-chevron-down"></i></button><div class="accordion-content"><ul>${job.restrictions.map(r => `<li>${r}</li>`).join('')}</ul></div></div>
            <div class="accordion"><button class="accordion-header"><span>Required Proofs</span><i class="fa-solid fa-chevron-down"></i></button><div class="accordion-content"><ul>${job.proofs.map(p => `<li>${p.instruction} <strong>(${p.type})</strong></li>`).join('')}</ul></div></div>`;
    };

    const renderRejectionInfo = (submission) => {
        rejectionInfoContainer.innerHTML = `
            <div class="rejection-info-box">
                <h3><i class="fa-solid fa-triangle-exclamation"></i> Resubmission Required</h3>
                <p><strong>Client's Reason:</strong> ${submission.rejectionReason}</p>
            </div>`;
        const style = document.createElement('style');
        style.textContent = `.rejection-info-box { background: rgba(235, 87, 87, 0.15); border-left: 4px solid #EB5757; padding: 1rem 1.5rem; margin-bottom: 2rem; border-radius: 0.5rem;} .rejection-info-box h3 { margin: 0 0 0.5rem 0; color: #EB5757; } .rejection-info-box p { margin: 0; color: var(--client-text-secondary); }`;
        document.head.appendChild(style);
    };

    const renderProofForm = (job) => {
        const proofFieldsHTML = job.proofs.map((proof, index) => {
            const inputId = `proof-input-${index}`;
            let fieldHTML = '';
            switch(proof.type) {
                case 'screenshot':
                    fieldHTML = `<div class="file-input-wrapper"><label for="${inputId}" class="btn-file-upload"><i class="fa-solid fa-image"></i> Choose File</label><span id="file-name-${index}" class="file-name">No file chosen</span><input type="file" id="${inputId}" class="proof-input-hidden" accept="image/*" required data-type="screenshot" data-instruction="${proof.instruction}"></div>`;
                    break;
                case 'link':
                    fieldHTML = `<input type="url" id="${inputId}" class="proof-input" placeholder="https://..." required data-type="link" data-instruction="${proof.instruction}">`;
                    break;
                default:
                    fieldHTML = `<textarea id="${inputId}" class="proof-input" placeholder="Enter text proof..." required data-type="text" data-instruction="${proof.instruction}"></textarea>`;
            }
            return `<div class="proof-group"><label for="${inputId}">${proof.instruction} <span class="proof-type">(${proof.type})</span></label>${fieldHTML}</div>`;
        }).join('');

        proofFormContainer.innerHTML = `
            <form id="proof-resubmission-form" class="proof-submission-form">
                <h3>Submit Your New Proof</h3>
                ${proofFieldsHTML}
                <button type="submit" class="btn-submit">Resubmit Proof</button>
            </form>`;
        
        // ✅ ATTACH EVENT LISTENERS RIGHT AFTER CREATING THE FORM
        proofFormContainer.querySelector('#proof-resubmission-form').addEventListener('submit', handleProofResubmit);
        job.proofs.forEach((proof, index) => {
            if (proof.type === 'screenshot') {
                const fileInput = document.getElementById(`proof-input-${index}`);
                const fileNameSpan = document.getElementById(`file-name-${index}`);
                fileInput.addEventListener('change', () => {
                    fileNameSpan.textContent = fileInput.files.length > 0 ? fileInput.files[0].name : 'No file chosen';
                });
            }
        });
    };

    // --- EVENT HANDLERS ---
    const handleProofResubmit = async (e) => {
        e.preventDefault();
        if (!currentUser) return showModal('error', 'Login Required', 'You must be logged in.');

        const submitBtn = e.target.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Resubmitting...';

        try {
            const proofInputs = Array.from(document.querySelectorAll('.proof-input, .proof-input-hidden'));
            const newProofs = [];
            for (const input of proofInputs) {
                const type = input.dataset.type;
                const instruction = input.dataset.instruction;
                let answer = '';
                if (type === 'screenshot') {
                    const file = input.files[0];
                    if (!file) throw new Error('Screenshot file is missing.');
                    const formData = new FormData();
                    formData.append('image', file);
                    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
                    const result = await response.json();
                    if (!result.success) throw new Error(result.error.message || 'Image upload failed.');
                    answer = result.data.url;
                } else {
                    answer = input.value;
                }
                newProofs.push({ type, instruction, answer });
            }

            const token = await currentUser.getIdToken();
            const response = await fetch('/.netlify/functions/resubmitProof', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId, submissionId, proofs: newProofs })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to resubmit.');

            showModal('success', 'Success!', 'Proof resubmitted successfully!');
            setTimeout(() => { window.location.href = '/worker/submissions.html'; }, 2000);

        } catch (error) {
            console.error('Resubmission failed:', error);
            showModal('error', 'Resubmission Failed', `Error: ${error.message}`);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Resubmit Proof';
        }
    };

    guidanceContainer.addEventListener('click', (e) => {
        const header = e.target.closest('.accordion-header');
        if (header) {
            header.classList.toggle('active');
            const content = header.nextElementSibling;
            content.classList.toggle('open');
            if (content.style.maxHeight) { content.style.maxHeight = null; } 
            else { content.style.maxHeight = content.scrollHeight + 'px'; }
        }
    });

    // --- INITIALIZATION ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            try {
                const jobRef = doc(db, "jobs", jobId);
                const submissionRef = doc(db, "jobs", jobId, "submissions", submissionId);
                const [jobSnap, subSnap] = await Promise.all([ getDoc(jobRef), getDoc(submissionRef) ]);

                if (!jobSnap.exists() || !subSnap.exists()) throw new Error("Job or submission not found.");
                
                const jobData = jobSnap.data();
                const subData = subSnap.data();
                
                if (subData.workerId !== user.uid) throw new Error("This is not your submission.");

                renderHeader(jobData);
                renderGuidance(jobData);
                renderRejectionInfo(subData);
                renderProofForm(jobData);
                
                loadingContainer.style.display = 'none';
                submissionCard.style.display = 'block';

            } catch(error) {
                console.error("Error loading resubmission page:", error);
                loadingContainer.innerHTML = `<h1 class="loading-title">${error.message}</h1>`;
            }
        } else { window.location.href = '/login.html'; }
    });
});