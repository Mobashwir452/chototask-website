// FILE: js/contact.js (Replace the entire file with this new version)

// 1. IMPORT from our firebase-config.js file
import { db } from './firebase-config.js';

// 2. IMPORT from the Firebase SDK
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 3. GET references to the HTML elements
const contactForm = document.querySelector('.contact-form');
const formButton = contactForm.querySelector('button');
const modal = document.getElementById('custom-modal');
const modalIcon = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalCloseBtn = document.getElementById('modal-close-btn');

// ========== NEW: Function to show the custom modal ==========
const showModal = (type, title, message) => {
    // Set the content
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    // Set the icon style
    modalIcon.innerHTML = type === 'success' 
        ? '<i class="fa-solid fa-check"></i>' 
        : '<i class="fa-solid fa-xmark"></i>';
    modalIcon.className = `modal-icon ${type}`; // Adds 'success' or 'error' class

    // Make the modal visible
    modal.classList.add('is-visible');
};

// Event listener to close the modal
modalCloseBtn.addEventListener('click', () => {
    modal.classList.remove('is-visible');
});

// 4. ADD an event listener to the form
contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = contactForm.name.value;
    const email = contactForm.email.value;
    const subject = contactForm.subject.value;
    const message = contactForm.message.value;

    if (!name || !email || !subject || !message) {
        // Use the new modal for validation errors
        showModal('error', 'Oops!', 'Please fill out all fields before sending.');
        return;
    }

    formButton.textContent = "Sending...";
    formButton.disabled = true;

    try {
        await addDoc(collection(db, "contact_submissions"), {
            name: name,
            email: email,
            subject: subject,
            message: message,
            timestamp: serverTimestamp(),
            status: "new"
        });
        
        // Use the new modal for success messages
        showModal('success', 'Thank You!', 'Your message has been sent successfully.');
        contactForm.reset();

    } catch (error) {
        console.error("Error adding document: ", error);
        // Use the new modal for submission errors
        showModal('error', 'Error', 'Sorry, there was a problem sending your message. Please try again.');
    } finally {
        formButton.textContent = "Send Securely";
        formButton.disabled = false;
    }
});