import { db } from './firebase-config.js';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const messagesContainer = document.getElementById('messages-container');

// Create a query to get all messages, ordered by the newest first
const q = query(collection(db, "contact_submissions"), orderBy("timestamp", "desc"));

// Use onSnapshot for real-time updates
const unsubscribe = onSnapshot(q, (querySnapshot) => {
    // Clear the container before adding new messages
    messagesContainer.innerHTML = '';
    
    if (querySnapshot.empty) {
        messagesContainer.innerHTML = '<p>No messages found.</p>';
        return;
    }

    querySnapshot.forEach((doc) => { // Changed 'document' to 'doc' to avoid conflict
        const messageData = doc.data();
        const messageId = doc.id;

        // Create the message card element
        const card = document.createElement('div');
        card.className = `message-card ${messageData.status}`; // 'new' or 'read'

        // Format the timestamp to a readable date
        const date = messageData.timestamp ? messageData.timestamp.toDate().toLocaleString() : 'No date';

        card.innerHTML = `
            <div class="message-header">
                <div>
                    <strong class="sender-name">${messageData.name}</strong>
                    <span class="sender-email">${messageData.email}</span>
                </div>
                <span class="message-time">${date}</span>
            </div>
            <div class="message-subject">${messageData.subject}</div>
            <p class="message-body">${messageData.message}</p>
            <div class="message-actions">
                <a href="mailto:${messageData.email}" class="btn btn-outline">Reply</a>
                ${messageData.status === 'new' ? `<button class="btn-mark-read btn btn-outline" data-id="${messageId}">Mark as Read</button>` : ''}
                <button class="btn-delete btn btn-danger" data-id="${messageId}">Delete</button>
            </div>
        `;

        messagesContainer.appendChild(card);
    });

    // Add event listeners after cards are created
    addEventListeners();
});

function addEventListeners() {
    // Event listener for all "Mark as Read" buttons
    document.querySelectorAll('.btn-mark-read').forEach(button => {
        button.addEventListener('click', async (e) => {
            const docId = e.target.dataset.id;
            const docRef = doc(db, "contact_submissions", docId);
            await updateDoc(docRef, {
                status: "read"
            });
            console.log(`Message ${docId} marked as read.`);
        });
    });

    // Event listener for all "Delete" buttons
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', async (e) => {
            const docId = e.target.dataset.id;
            if (confirm("Are you sure you want to delete this message permanently?")) {
                await deleteDoc(doc(db, "contact_submissions", docId));
                console.log(`Message ${docId} deleted.`);
            }
        });
    });
}
