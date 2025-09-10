// FILE: /worker/js/worker-task-submission.js (FINAL & COMPLETE)

import { auth, db } from '/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const IMGBB_API_KEY = '2b154785f011c31f9c3b3a7ebae0f082';

document.addEventListener('componentsLoaded', () => {

    const loadingContainer = document.getElementById('loading-container');
    const submissionCard = document.getElementById('submission-card');
    const headerContainer = document.getElementById('card-header-container');
    const guidanceContainer = document.getElementById('submission-guidance');
    const proofFormContainer = document.getElementById('proof-form-container');

    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');
    let currentUser;

    if (!jobId) {
        loadingContainer.innerHTML = `<h1 class="loading-title">Job Not Found</h1>`;
        return;
    }

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

    const renderHeader = (job) => {
        headerContainer.innerHTML = `
            <div class="submission-header">
                <a href="/worker/job-details.html?id=${jobId}" class="back-btn">
                    <i class="fa-solid fa-arrow-left"></i> Back to Task Details
                </a>
                <div class="task-payout">
                    <i class="fa-solid fa-hand-holding-dollar"></i>
                    <strong>৳${job.costPerWorker}</strong>
                </div>
            </div>`;
    };

    const renderGuidance = (job) => {
        guidanceContainer.innerHTML = `
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
            </div>
        `;
    };

    const renderProofForm = (job) => {
        const proofFieldsHTML = job.proofs.map((proof, index) => {
            let fieldHTML = '';
            const inputId = `proof-input-${index}`;
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
        const checkboxHTML = `
            <div class="form-group-checkbox">
                <input type="checkbox" id="submission-terms" required>
                <label for="submission-terms">I understand that the client has 24 hours to review my submission. If rejected, I will have 12 hours to resubmit my proof once. Failure to resubmit in time will result in task cancellation.</label>
            </div>`;
        proofFormContainer.innerHTML = `
            <form id="proof-submission-form" class="proof-submission-form">
                <h3>Submit Your Proof</h3>
                ${proofFieldsHTML}
                ${checkboxHTML}
                <button type="submit" class="btn-submit" id="main-submit-btn">Submit Proof</button>
            </form>
        `;
        proofFormContainer.querySelector('#proof-submission-form').addEventListener('submit', handleProofSubmit);
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
    
    const handleProofSubmit = async (e) => {
        e.preventDefault();
        if (!currentUser) return showModal('error', 'Login Required', 'You must be logged in to submit proof.');
        const termsCheckbox = document.getElementById('submission-terms');
        if (!termsCheckbox.checked) {
            return showModal('error', 'Agreement Required', 'You must agree to the submission terms before proceeding.');
        }
        const submitBtn = e.target.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        try {
            const proofInputs = Array.from(document.querySelectorAll('.proof-input, .proof-input-hidden'));
            const submittedProofs = [];
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
                submittedProofs.push({ type, instruction, answer });
            }
            const token = await currentUser.getIdToken();
            const response = await fetch('/.netlify/functions/createSubmission', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jobId: jobId,
                    proofs: submittedProofs
                })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to submit proof.');
            }
            showModal('success', 'Success!', result.message);
            setTimeout(() => { window.location.href = '/worker/submissions.html'; }, 2000);
        } catch (error) {
            console.error('Submission failed:', error);
            showModal('error', 'Submission Failed', `Error: ${error.message}`);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Proof';
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
    
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            const docRef = doc(db, "jobs", jobId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const jobData = docSnap.data();
                renderHeader(jobData);
                renderGuidance(jobData);
                renderProofForm(jobData);
                loadingContainer.style.display = 'none';
                submissionCard.style.display = 'block';
            } else {
                loadingContainer.innerHTML = `<h1 class="loading-title">Job Not Found</h1>`;
            }
        } else { window.location.href = '/login.html'; }
    });
});