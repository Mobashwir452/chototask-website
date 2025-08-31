// === FILE: /worker/js/worker-task-submission.js (CORRECTED) ===

import { auth, db, storage } from '/js/firebase-config.js';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, runTransaction, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {

    const loadingContainer = document.getElementById('loading-container');
    const submissionLayout = document.getElementById('submission-layout');
    const guidanceContainer = document.getElementById('submission-guidance');
    const proofFormContainer = document.getElementById('proof-form-container');

    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');
    let currentUser;

    if (!jobId) {
        loadingContainer.innerHTML = `<h1 class="loading-title">Job Not Found</h1>`;
        return;
    }

    const renderGuidance = (job) => {
        guidanceContainer.innerHTML = `
            <div class="guidance-card">
                <h3>Task Instructions</h3>
                <ul>${job.instructions.map(i => `<li>${i}</li>`).join('')}</ul>
                <h3>Task Rules</h3>
                <ul>${job.restrictions.map(r => `<li>${r}</li>`).join('')}</ul>
            </div>`;
    };

    const renderProofForm = (job) => {
        const proofFieldsHTML = job.proofs.map((proof, index) => {
            let fieldHTML = '';
            const inputId = `proof-input-${index}`;
            switch(proof.type) {
                case 'screenshot':
                    fieldHTML = `<input type="file" id="${inputId}" class="proof-input" accept="image/*" required data-type="screenshot" data-instruction="${proof.instruction}">`;
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
        // Attach listener after form is in the DOM
        proofFormContainer.querySelector('#proof-submission-form').addEventListener('submit', handleProofSubmit);
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

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            onSnapshot(doc(db, "jobs", jobId), (docSnap) => {
                if (docSnap.exists()) {
                    const jobData = docSnap.data();
                    renderGuidance(jobData);
                    renderProofForm(jobData);
                    loadingContainer.style.display = 'none';
                    submissionLayout.style.display = 'flex';
                } else {
                    loadingContainer.innerHTML = `<h1 class="loading-title">Job Not Found</h1>`;
                }
            });
        } else { window.location.href = '/login.html'; }
    });
});