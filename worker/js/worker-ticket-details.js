// FILE: /worker/js/worker-ticket-details.js
// THIS FILE'S CONTENT IS IDENTICAL TO /client/js/client-ticket-details.js

import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
            
            // Listen for real-time updates on the main ticket document for status changes
            onSnapshot(ticketRef, (ticketSnap) => {
                if (!ticketSnap.exists() || ticketSnap.data().userId !== user.uid) {
                    subjectTitle.textContent = "Access Denied";
                    statusSubtitle.textContent = "You do not have permission to view this ticket.";
                    replyForm.style.display = 'none'; // Hide reply form if no access
                    return;
                }

                const ticketData = ticketSnap.data();
                subjectTitle.textContent = `${ticketData.subject}`;
                statusSubtitle.textContent = `Status: ${ticketData.status}`;

                // Fetch and render replies only after confirming access
                const repliesQuery = query(collection(db, "supportTickets", ticketId, "replies"), orderBy("sentAt", "asc"));
                onSnapshot(repliesQuery, (snapshot) => {
                    let html = `<div class="message-bubble user"><div class="message-header">You (${ticketData.userName})</div><p class="message-body">${ticketData.message}</p></div>`;
                    snapshot.forEach(doc => {
                        const reply = doc.data();
                        const authorClass = reply.author === 'user' ? 'user' : 'admin';
                        const authorName = reply.author === 'user' ? `You (${ticketData.userName})` : 'Support Team';
                        html += `<div class="message-bubble ${authorClass}"><div class="message-header">${authorName}</div><p class="message-body">${reply.message}</p></div>`;
                    });
                    conversationThread.innerHTML = html;
                });
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
                    author: 'user', // 'user' represents the ticket owner (client or worker)
                    sentAt: serverTimestamp()
                });
                
                // Also update the parent ticket's last reply time and potentially status
                await updateDoc(ticketRef, {
                    lastRepliedAt: serverTimestamp(),
                    status: 'in_progress'
                });

                replyMessageInput.value = '';
                submitBtn.disabled = false;
            });
        } else { 
            window.location.href = '/login.html'; 
        }
    });
});