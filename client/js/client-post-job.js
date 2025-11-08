// FILE: /client/js/client-post-job.js (Final Version)

import { auth, db } from '/js/firebase-config.js';
import { doc, getDoc, collection, addDoc, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {

    let currentUser;
    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
        } else {
            window.location.href = '/login.html';
        }
    });

    // --- FORM & MODAL ELEMENTS ---
    const form = document.getElementById('create-job-form');
    const modal = document.getElementById('custom-modal');
    const modalIcon = document.getElementById('modal-icon');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalCloseBtn = document.getElementById('modal-close-btn');


    const showModal = (type, title, message) => {
        if (!modal) return;
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalIcon.className = `modal-icon ${type}`;
        modal.classList.add('is-visible');
    };

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            if (modal) {
                modal.classList.remove('is-visible');
            }
        });
    }

    // --- All other elements ---
    const steps = Array.from(document.querySelectorAll('.form-step'));
    const progressSteps = Array.from(document.querySelectorAll('.progress-step'));
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const submitBtn = document.getElementById('submit-btn');
    const instructionList = document.getElementById('instruction-list');
    const restrictionList = document.getElementById('restriction-list');
    const proofList = document.getElementById('proof-list');
    const addInstructionBtn = document.getElementById('add-instruction-btn');
    const addRestrictionBtn = document.getElementById('add-restriction-btn');
    const addScreenshotProofBtn = document.getElementById('add-screenshot-proof-btn');
    const addTextProofBtn = document.getElementById('add-text-proof-btn');
    const addLinkProofBtn = document.getElementById('add-link-proof-btn');
    const workersNeededInput = document.getElementById('workers-needed');
    const costPerWorkerInput = document.getElementById('cost-per-worker');
    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryFee = document.getElementById('summary-fee');
    const summaryTotal = document.getElementById('summary-total');
    const reviewContainer = document.getElementById('review-container');

    let currentStep = 1;
    const PLATFORM_FEE_PERCENTAGE = 0.10;

    const updateButtons = () => {
        if (!prevBtn) return;
        prevBtn.style.display = currentStep > 1 ? 'inline-block' : 'none';
        submitBtn.style.display = currentStep === steps.length ? 'inline-block' : 'none';
        nextBtn.style.display = currentStep < steps.length ? 'inline-block' : 'none';
    };

    const updateProgress = () => {
        progressSteps.forEach((step, index) => {
            if (index < currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    };

    const showStep = () => {
        steps.forEach(step => step.classList.remove('active'));
        if (steps[currentStep - 1]) {
            steps[currentStep - 1].classList.add('active');
        }
        updateButtons();
        updateProgress();
    };


    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            // Step 1 Validation
            if (currentStep === 1) {
                const title = document.getElementById('job-title').value.trim();
                const category = document.getElementById('job-category').value;
                if (title === '' || category === '') {
                    showModal('error', 'Missing Information', 'Please fill out both Job Title and Category before proceeding.');
                    return;
                }
            }
// Step 2 Validation (REVISED BLOCK)
            if (currentStep === 2) {
                const instructionItems = instructionList.querySelectorAll('input'); //
                const restrictionItems = restrictionList.querySelectorAll('input'); //
                
                const instructionCount = instructionItems.length;
                const restrictionCount = restrictionItems.length;

                // 1. Check if lists are empty (আগের চেক)
                if (instructionCount === 0 || restrictionCount === 0) {
                    showModal('error', 'Missing Steps', 'Please add at least one instruction and one restriction.'); //
                    return;
                }

                // 2. NEW: Check if any input value is empty (নতুন চেক)
                // We combine both lists and check them all
                const allInputs = [...instructionItems, ...restrictionItems];
                const hasEmptyInput = allInputs.some(input => input.value.trim() === ''); //

                if (hasEmptyInput) {
                    showModal('error', 'Empty Fields', 'Please fill out all added instructions and rules. Do not leave any field blank.');
                    return;
                }
            }

            // Step 3 Validation (REVISED BLOCK)
            if (currentStep === 3) {
                const proofInputs = proofList.querySelectorAll('input'); //
                const proofCount = proofInputs.length;

                // 1. Check if the list is empty (আগের চেক)
                if (proofCount === 0) { //
                    showModal('error', 'Proof Required', 'Please add at least one proof requirement.'); //
                    return;
                }

                // 2. NEW: Check if any proof input value is empty (নতুন চেক)
                const hasEmptyInput = Array.from(proofInputs).some(input => input.value.trim() === ''); //

                if (hasEmptyInput) {
                    showModal('error', 'Empty Instruction', 'Please fill out all added proof instructions. Do not leave any field blank.');
                    return;
                }
            }


            // Step 4 Validation
            if (currentStep === 4) {
                const workers = document.getElementById('workers-needed').value;
                const cost = document.getElementById('cost-per-worker').value;
                const cooldown = document.getElementById('submission-cooldown').value;
                if (!workers || !cost || cooldown === '') {
                    showModal('error', 'All Fields Required', 'Please fill out all budget and setting fields to continue.');
                    return;
                }
            }

            if (currentStep < steps.length) {
                if (currentStep === steps.length - 1) {
                    populateReview();
                }
                currentStep++;
                showStep();
            }
        });
    }

    if(prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                showStep();
            }
        });
    }
    
    const createListItem = (list, placeholder) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        const count = list.children.length + 1;
        item.innerHTML = `<span class="list-item-number">${count}</span><input type="text" placeholder="${placeholder}" required><button type="button" class="btn-remove"><i class="fa-solid fa-trash-can"></i></button>`;
        list.appendChild(item);
    };

    const createProofItem = (type) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.dataset.proofType = type;
        let iconClass = 'fa-font';
        if (type === 'screenshot') iconClass = 'fa-image';
        if (type === 'link') iconClass = 'fa-link';
        item.innerHTML = `<span class="list-item-number"><i class="fa-solid ${iconClass}"></i></span><input type="text" placeholder="Proof instruction, e.g., 'Submit the link to your profile'" required><button type="button" class="btn-remove"><i class="fa-solid fa-trash-can"></i></button>`;
        proofList.appendChild(item);
    };

    if (addInstructionBtn) addInstructionBtn.addEventListener('click', () => createListItem(instructionList, `Step ${instructionList.children.length + 1}...`));
    if (addRestrictionBtn) addRestrictionBtn.addEventListener('click', () => createListItem(restrictionList, `Rule ${restrictionList.children.length + 1}...`));
    if (addScreenshotProofBtn) addScreenshotProofBtn.addEventListener('click', () => createProofItem('screenshot'));
    if (addTextProofBtn) addTextProofBtn.addEventListener('click', () => createProofItem('text'));
    if (addLinkProofBtn) addLinkProofBtn.addEventListener('click', () => createProofItem('link'));
    
    document.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove')) {
            e.target.closest('.list-item').remove();
        }
    });
    
    const calculateCost = () => {
        if (!workersNeededInput || !costPerWorkerInput) return;
        const workers = parseInt(workersNeededInput.value) || 0;
        const cost = parseFloat(costPerWorkerInput.value) || 0;
        const subtotal = workers * cost;
        const fee = subtotal * PLATFORM_FEE_PERCENTAGE;
        const total = subtotal + fee;
        summarySubtotal.textContent = `৳${subtotal.toFixed(2)}`;
        summaryFee.textContent = `৳${fee.toFixed(2)}`;
        summaryTotal.textContent = `৳${total.toFixed(2)}`;
    };

    if (workersNeededInput) workersNeededInput.addEventListener('input', calculateCost);
    if (costPerWorkerInput) costPerWorkerInput.addEventListener('input', calculateCost);

    const populateReview = () => {
        const title = document.getElementById('job-title').value;
        const cooldownSelect = document.getElementById('submission-cooldown');
        const cooldownText = cooldownSelect.options[cooldownSelect.selectedIndex].text;

        const instructions = Array.from(instructionList.querySelectorAll('input')).map(i => i.value);
        const restrictions = Array.from(restrictionList.querySelectorAll('input')).map(i => i.value);
        const proofs = Array.from(proofList.querySelectorAll('.list-item')).map(item => ({ type: item.dataset.proofType, instruction: item.querySelector('input').value }));
        
        let reviewHTML = `<h4>Job Details</h4><p><strong>Title:</strong> ${title}</p>`;
        reviewHTML += `<h4>Settings</h4><p><strong>Worker Cooldown:</strong> ${cooldownText}</p>`;
        reviewHTML += `<h4>Instructions</h4><ul>${instructions.map(i => `<li>${i}</li>`).join('')}</ul>`;
        if (restrictions.length > 0) reviewHTML += `<h4>Restrictions</h4><ul>${restrictions.map(r => `<li>${r}</li>`).join('')}</ul>`;
        reviewHTML += `<h4>Proof Required</h4><ul>${proofs.map(p => `<li>${p.instruction} (${p.type})</li>`).join('')}</ul>`;
        reviewHTML += `<h4>Budget</h4><p>${summaryTotal.textContent} for ${workersNeededInput.value} workers</p>`;
        
        reviewContainer.innerHTML = reviewHTML;
    };

    if (form) {
        form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) {
            showModal('error', 'Not Logged In', 'You must be logged in to post a job.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';

        try {
            // Collect all job data into a single object
            const jobData = {
                title: document.getElementById('job-title').value,
                category: document.getElementById('job-category').value,
                instructions: Array.from(document.getElementById('instruction-list').querySelectorAll('input')).map(i => i.value),
                restrictions: Array.from(document.getElementById('restriction-list').querySelectorAll('input')).map(i => i.value),
                proofs: Array.from(document.getElementById('proof-list').querySelectorAll('.list-item')).map(item => ({ type: item.dataset.proofType, instruction: item.querySelector('input').value })),
                workersNeeded: parseInt(document.getElementById('workers-needed').value),
                costPerWorker: parseFloat(document.getElementById('cost-per-worker').value),
                totalCost: parseFloat(document.getElementById('summary-total').textContent.replace('৳', '')),
                submissionCooldown: parseInt(document.getElementById('submission-cooldown').value),
                status: 'pending_review',
            };
            
            const token = await currentUser.getIdToken();
            const response = await fetch('/.netlify/functions/postJob', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(jobData)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to post job.');
            }

            showModal('success', 'Success!', 'Your job has been submitted for review.');
            document.getElementById('modal-close-btn').onclick = () => {
                window.location.href = '/client/my-jobs.html';
            };

        } catch (error) {
            console.error("Error posting job:", error);
            showModal('error', 'Submission Failed', `Error: ${error.message}`);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post Job';
        }
    });
    }

    if (steps.length > 0) {
        showStep();
        createListItem(instructionList, 'Step 1...');
    }
});