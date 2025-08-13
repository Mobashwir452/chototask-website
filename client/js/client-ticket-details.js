// FILE: /client/js/client-ticket-details.js
import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('componentsLoaded', () => {
    const subjectTitle = document.getElementById('ticket-subject-title');
    const statusSubtitle = document.getElementById('ticket-status-subtitle');
    const conversationThread = document.getElementById('conversation-thread');
    const replyForm = document.getElementById('reply-form');
    const replyMessageInput = document.getElementById('reply-message');
    
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('id');

    if (!ticketId) { subjectTitle.textContent = "Ticket Not Found"; return; }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const ticketRef = doc(db, "supportTickets", ticketId);
            const ticketSnap = await getDoc(ticketRef);

            if (!ticketSnap.exists() || ticketSnap.data().userId !== user.uid) {
                subjectTitle.textContent = "Access Denied";
                statusSubtitle.textContent = "You do not have permission to view this ticket.";
                return;
            }

            const ticketData = ticketSnap.data();
            subjectTitle.textContent = `Ticket: ${ticketData.subject}`;
            statusSubtitle.textContent = `Status: ${ticketData.status}`;

            const repliesQuery = query(collection(db, "supportTickets", ticketId, "replies"), orderBy("sentAt", "asc"));
            onSnapshot(repliesQuery, (snapshot) => {
                let html = `<div class="message-bubble user"><div class="message-header">You</div><p class="message-body">${ticketData.message}</p></div>`;
                snapshot.forEach(doc => {
                    const reply = doc.data();
                    const author = reply.author === 'user' ? 'You' : 'Support Team';
                    html += `<div class="message-bubble ${reply.author}"><div class="message-header">${author}</div><p class="message-body">${reply.message}</p></div>`;
                });
                conversationThread.innerHTML = html;
            });

            replyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const replyText = replyMessageInput.value;
                if (!replyText.trim()) return;

                const submitBtn = replyForm.querySelector('button');
                submitBtn.disabled = true;
                
                const repliesRef = collection(db, "supportTickets", ticketId, "replies");
                await addDoc(repliesRef, {
                    message: replyText,
                    author: 'user',
                    sentAt: serverTimestamp()
                });
                
                replyMessageInput.value = '';
                submitBtn.disabled = false;
            });
        } else { window.location.href = '/login.html'; }
    });
});