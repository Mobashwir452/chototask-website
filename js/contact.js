// FILE: js/contact.js

// 1. IMPORT a function from our firebase-config.js file
import { db } from './firebase-config.js';

// 2. IMPORT the necessary functions from the Firebase SDK
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 3. GET references to the HTML elements
const contactForm = document.querySelector('.contact-form');
const formButton = contactForm.querySelector('button');

// 4. ADD an event listener to the form
contactForm.addEventListener('submit', async (e) => {
    // Prevent the default browser action (page reloading)
    e.preventDefault();

    // Get the values from the form fields
    const name = contactForm.name.value;
    const email = contactForm.email.value;
    const subject = contactForm.subject.value;
    const message = contactForm.message.value;

    // Basic validation to ensure fields are not empty
    if (!name || !email || !subject || !message) {
        alert("Please fill out all fields.");
        return;
    }

    // Change button text to show it's working
    formButton.textContent = "Sending...";
    formButton.disabled = true;

    try {
        // 5. TRY to add a new document to our Firestore collection
        const docRef = await addDoc(collection(db, "contact_submissions"), {
            name: name,
            email: email,
            subject: subject,
            message: message,
            timestamp: serverTimestamp(), // Add the current time
            status: "new" // Set the initial status
        });

        console.log("Document written with ID: ", docRef.id);
        
        // Give success feedback to the user
        alert("Thank you! Your message has been sent successfully.");
        contactForm.reset(); // Clear the form fields

    } catch (error) {
        // If an error occurs...
        console.error("Error adding document: ", error);
        // Give error feedback to the user
        alert("Sorry, there was an error sending your message. Please try again.");
    } finally {
        // This runs whether it was a success or an error
        // Re-enable the button and reset its text
        formButton.textContent = "Send Securely";
        formButton.disabled = false;
    }
});
