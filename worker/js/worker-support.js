// FILE: /worker/js/worker-support.js

import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('componentsLoaded', () => {

    // --- FAQ Accordion Logic ---
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            const isActive = question.classList.contains('active');

            // Close all other open questions
            faqQuestions.forEach(q => {
                if (q !== question) {
                    q.classList.remove('active');
                    q.nextElementSibling.style.maxHeight = 0;
                }
            });

            if (!isActive) {
                question.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + 'px';
            } else {
                question.classList.remove('active');
                answer.style.maxHeight = 0;
            }
        });
    });

    // --- Contact Form Logic ---
    const contactForm = document.getElementById('contact-form');
    const nameInput = document.getElementById('contact-name');
    const emailInput = document.getElementById('contact-email');
    const formMessage = document.getElementById('form-message');

    let currentUser = null;
    let currentUserData = null;

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                currentUserData = userDoc.data();
                nameInput.value = currentUserData.fullName || user.displayName;
                emailInput.value = user.email;
            }
        } else {
            window.location.href = '/login.html';
        }
    });

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = contactForm.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        formMessage.textContent = '';

        try {
            const ticketData = {
                userName: nameInput.value,
                userEmail: emailInput.value,
                subject: document.getElementById('contact-subject').value,
                message: document.getElementById('contact-message').value,
                status: 'new',
                submittedAt: serverTimestamp(),
                userId: currentUser.uid,
                userRole: 'worker' // ✅ Set userRole to 'worker'
            };

            await addDoc(collection(db, 'supportTickets'), ticketData);

            formMessage.textContent = 'Your message has been sent successfully!';
            formMessage.className = 'form-message message-success';
            contactForm.reset();
            
            // Re-populate disabled fields after reset
            if(currentUserData) nameInput.value = currentUserData.fullName;
            if(currentUser) emailInput.value = currentUser.email;

        } catch (error) {
            console.error("Error submitting ticket:", error);
            formMessage.textContent = 'Failed to send message. Please try again.';
            formMessage.className = 'form-message message-error';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Message';
        }
    });
});