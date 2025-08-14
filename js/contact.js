// FILE: /js/contact.js (FINAL UPDATED VERSION)

import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- GET HTML ELEMENTS ---
const contactForm = document.querySelector('.contact-form');
const formButton = contactForm.querySelector('button');
const modal = document.getElementById('custom-modal');
const modalIcon = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalCloseBtn = document.getElementById('modal-close-btn');

// --- HELPER FUNCTIONS ---

const showModal = (type, title, message) => {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalIcon.innerHTML = type === 'success' 
        ? '<i class="fa-solid fa-check"></i>' 
        : '<i class="fa-solid fa-xmark"></i>';
    modalIcon.className = `modal-icon ${type}`;
    modal.classList.add('is-visible');
};

function generateSecureToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 24; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

// ✅ NEW: Function to create the short, readable ID for your admins
function generateReadableId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    let id = '';
    for (let i = 0; i < 3; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    id += '-';
    for (let i = 0; i < 3; i++) {
        id += nums.charAt(Math.floor(Math.random() * nums.length));
    }
    return id;
}

// --- EVENT LISTENERS ---

modalCloseBtn.addEventListener('click', () => {
    modal.classList.remove('is-visible');
});

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value;

    if (!name || !email || !subject || !message) {
        showModal('error', 'Oops!', 'Please fill out all fields before sending.');
        return;
    }

    formButton.textContent = "Sending...";
    formButton.disabled = true;

    try {
        const ticketData = {
            userName: name,
            userEmail: email,
            subject: subject,
            message: message,
            status: "new",
            submittedAt: serverTimestamp(),
            userId: 'guest',
            userRole: 'guest',
            secureToken: generateSecureToken(),
            // ✅ NEW: Add the readable ID from your plan
            ticketId: generateReadableId() 
        };
        
        await addDoc(collection(db, "supportTickets"), ticketData);
        
        showModal('success', 'Thank You!', 'Your message has been sent successfully.');
        contactForm.reset();

    } catch (error) {
        console.error("Error submitting ticket: ", error);
        showModal('error', 'Error', 'Sorry, there was a problem sending your message. Please try again.');
    } finally {
        formButton.textContent = "Send Securely";
        formButton.disabled = false;
    }
});