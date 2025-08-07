// FILE: js/admin-messages.js

import { db } from './firebase-config.js';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const messagesContainer = document.getElementById('messages-container');

// This function simply escapes HTML to prevent XSS attacks
function escapeHTML(str) {
    const p = document.createElement('p');
    p.appendChild(document.createTextNode(str));
    return p.innerHTML;
}

// Set the page title in the header
document.addEventListener('adminComponentsLoaded', () => {
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.textContent = 'Messages';
    }
});

// Create a query to get all messages, ordered by the newest first
const q = query(collection(db, "contact_submissions"), orderBy("timestamp", "desc"));

// Use onSnapshot for real-time updates
onSnapshot(q, (querySnapshot) => {
    messagesContainer.innerHTML = '';
    
    if (querySnapshot.empty) {
        messagesContainer.innerHTML = '<p>No messages found.</p>';
        return;
    }

    querySnapshot.forEach((doc) => {
        const messageData = doc.data();
        const messageId = doc.id;
        const card = document.createElement('div');
        card.className = `message-card ${messageData.status || 'new'}`;

        const date = messageData.timestamp ? messageData.timestamp.toDate().toLocaleString() : 'No date';

        card.innerHTML = `
            <div class="message-header">
                <div>
                    <strong class="sender-name">${escapeHTML(messageData.name)}</strong>
                    <span class="sender-email">${escapeHTML(messageData.email)}</span>
                </div>
                <span class="message-time">${date}</span>
            </div>
            <div class="message-subject">${escapeHTML(messageData.subject)}</div>
            <p class="message-body">${escapeHTML(messageData.message)}</p>
            <div class="message-actions">
                <a href="mailto:${escapeHTML(messageData.email)}" class="admin-btn admin-btn-outline">Reply</a>
                ${messageData.status !== 'read' ? `<button class="btn-mark-read admin-btn admin-btn-outline" data-id="${messageId}">Mark as Read</button>` : ''}
                <button class="btn-delete admin-btn btn-danger" data-id="${messageId}">Delete</button>
            </div>
        `;
        messagesContainer.appendChild(card);
    });

    addEventListeners();
});

function addEventListeners() {
    document.querySelectorAll('.btn-mark-read').forEach(button => {
        button.addEventListener('click', async (e) => {
            const docId = e.target.dataset.id;
            const docRef = doc(db, "contact_submissions", docId);
            await updateDoc(docRef, { status: "read" });
        });
    });

    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', async (e) => {
            const docId = e.target.dataset.id;
            if (confirm("Are you sure you want to delete this message permanently?")) {
                await deleteDoc(doc(db, "contact_submissions", docId));
            }
        });
    });
}