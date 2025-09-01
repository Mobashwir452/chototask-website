// === FILE: /worker/js/worker-task-submission.js ===

import { auth, db, storage } from '/js/firebase-config.js';
import { doc, getDoc, collection, addDoc, serverTimestamp, runTransaction, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// REPLACE the old renderHeader function with this new one

// REPLACE the old renderHeader function with this new one

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

 // REPLACE the old renderProofForm function with this new one

const renderProofForm = (job) => {
    const proofFieldsHTML = job.proofs.map((proof, index) => {
        let fieldHTML = '';
        const inputId = `proof-input-${index}`;
        switch(proof.type) {
            case 'screenshot':
                // NEW: Custom file input structure
                fieldHTML = `
                    <div class="file-input-wrapper">
                        <label for="${inputId}" class="btn-file-upload">
                            <i class="fa-solid fa-image"></i> Choose File
                        </label>
                        <span id="file-name-${index}" class="file-name">No file chosen</span>
                        <input type="file" id="${inputId}" class="proof-input-hidden" accept="image/*" required data-type="screenshot" data-instruction="${proof.instruction}">
                    </div>
                `;
                break;
            case 'link':
                fieldHTML = `<input type="url" id="${inputId}" class="proof-input" placeholder="https://..." required data-type="link" data-instruction="${proof.instruction}">`;
                break;
            case 'text':
            default:
                fieldHTML = `<textarea id="${inputId}" class="proof-input" placeholder="Enter text proof..." required data-type="text" data-instruction="${proof.instruction}"></textarea>`;
        }
        return `
            <div class="proof-group">
                <label for="${inputId}">${proof.instruction} <span class="proof-type">(${proof.type})</span></label>
                ${fieldHTML}
            </div>`;
    }).join('');

    proofFormContainer.innerHTML = `
        <form id="proof-submission-form" class="proof-submission-form">
            <h3>Submit Your Proof</h3>
            ${proofFieldsHTML}
            <button type="submit" class="btn-submit" id="main-submit-btn">Submit Proof</button>
        </form>
    `;

    // Add event listener to the form
    proofFormContainer.querySelector('#proof-submission-form').addEventListener('submit', handleProofSubmit);

    // Add event listeners for custom file inputs to show the selected file's name
    job.proofs.forEach((proof, index) => {
        if (proof.type === 'screenshot') {
            const fileInput = document.getElementById(`proof-input-${index}`);
            const fileNameSpan = document.getElementById(`file-name-${index}`);
            fileInput.addEventListener('change', () => {
                if (fileInput.files.length > 0) {
                    fileNameSpan.textContent = fileInput.files[0].name;
                } else {
                    fileNameSpan.textContent = 'No file chosen';
                }
            });
        }
    });
};

    const handleProofSubmit = async (e) => {
        e.preventDefault();
        if (!currentUser) { alert('You must be logged in.'); return; }
        const submitBtn = e.target.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        try {
            const proofInputs = Array.from(document.querySelectorAll('.proof-input'));
            const submittedProofs = [];
            for (const input of proofInputs) {
                const type = input.dataset.type;
                const instruction = input.dataset.instruction;
                let answer = '';
                if (type === 'screenshot') {
                    const file = input.files[0];
                    if (!file) throw new Error('Screenshot file is missing.');
                    const storageRef = ref(storage, `proofs/${jobId}/${currentUser.uid}/${Date.now()}_${file.name}`);
                    const snapshot = await uploadBytes(storageRef, file);
                    answer = await getDownloadURL(snapshot.ref);
                } else {
                    answer = input.value;
                }
                submittedProofs.push({ type, instruction, answer });
            }
            const submissionData = { workerId: currentUser.uid, jobId: jobId, submittedAt: serverTimestamp(), status: 'pending', proofs: submittedProofs };
            const jobRef = doc(db, "jobs", jobId);
            const submissionsColRef = collection(db, "jobs", jobId, "submissions");
            await runTransaction(db, async (transaction) => {
                transaction.set(doc(submissionsColRef), submissionData);
                transaction.update(jobRef, { submissionsPending: increment(1) });
            });
            alert('Proof submitted successfully!');
            window.location.href = '/worker/submissions.html';
        } catch (error) {
            console.error('Submission failed:', error);
            alert(`Error: ${error.message}`);
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
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + 'px';
            }
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