import { auth, db } from '/js/firebase-config.js';
// ✅ FIX: Added the import for the Firebase Auth library
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const infoModal = document.getElementById('info-modal');
const infoModalTitle = document.getElementById('info-modal-title');
const infoModalBody = document.getElementById('info-modal-body');
const infoModalCloseBtn = document.getElementById('info-modal-close-btn');
const infoModalOkBtn = document.getElementById('info-modal-ok-btn');
const breadcrumbs = document.getElementById('breadcrumbs');
const ticketSubject = document.getElementById('ticket-subject');
const ticketFrom = document.getElementById('ticket-from');
const conversationThread = document.getElementById('conversation-thread');
const statusSelect = document.getElementById('status-select');
const updateStatusBtn = document.getElementById('update-status-btn');
const userInfoContent = document.getElementById('user-info-content');
const replyForm = document.getElementById('reply-form');
const replyMessageInput = document.getElementById('reply-message');
const replyFormMessage = document.getElementById('reply-form-message');
const guestLinkCard = document.getElementById('guest-link-card');
const guestLinkInput = document.getElementById('guest-link-input');
const copyLinkBtn = document.getElementById('copy-link-btn');

const statuses = ['new', 'in_progress', 'resolved'];
let ticketId = null;


const showInfoModal = (title, message) => {
    infoModalTitle.textContent = title;
    infoModalBody.textContent = message;
    infoModal.style.display = 'flex';
};


const hideInfoModal = () => {
    infoModal.style.display = 'none';
};

const renderConversation = (originalMessage, replies) => {
    let html = `<div class="message-bubble user"><div class="message-header">User's Original Message</div><div class="message-body">${originalMessage}</div></div>`;
    replies.forEach(reply => {
        const author = reply.author === 'admin' ? 'Support Team' : 'User';
        html += `<div class="message-bubble ${reply.author}"><div class="message-header">${author} Replied</div><div class="message-body">${reply.message}</div></div>`;
    });
    conversationThread.innerHTML = html;
};

const renderPage = (ticket, user) => {
    breadcrumbs.innerHTML = `<a href="/admin/support/tickets.html">Tickets</a> / ${ticket.subject}`;
    ticketSubject.textContent = ticket.subject;
    ticketFrom.textContent = `From: ${ticket.userName} (${ticket.userEmail})`;
    statusSelect.innerHTML = statuses.map(s => `<option value="${s}" ${ticket.status === s ? 'selected' : ''}>${s.replace('_', ' ')}</option>`).join('');

    if (ticket.userRole === 'guest') {
        userInfoContent.innerHTML = '<p class="a-empty">This ticket is from a guest user.</p>';
        const link = `${window.location.origin}/view-ticket.html?id=${ticketId}&token=${ticket.secureToken}`;
        guestLinkInput.value = link;
        guestLinkCard.style.display = 'block';
    } else if (user) {
        const plan = user.accountType || 'free'; 
        userInfoContent.innerHTML = `
            <div class="info-row"><span>User</span> <a href="/admin/user-details.html?id=${ticket.userId}">${user.fullName}</a></div>
            <div class="info-row"><span>Role</span> <strong>${user.role}</strong></div>
            <div class="info-row"><span>Plan</span> <strong>${plan}</strong></div>
        `;
    }
};

const updateStatus = async () => {
    const newStatus = statusSelect.value;
    const ticketRef = doc(db, "supportTickets", ticketId);
    try {
        await updateDoc(ticketRef, { status: newStatus });
        showInfoModal('Success', 'Status updated successfully!');
    } catch (error) {
        console.error("Error updating status:", error);
        showInfoModal('Error', 'Failed to update status.');
    }
};

const saveReply = async (e) => {
    e.preventDefault();
    const replyText = replyMessageInput.value;
    if (!replyText.trim()) return;

    const submitBtn = replyForm.querySelector('button');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    replyFormMessage.textContent = '';

    try {
        const repliesRef = collection(db, "supportTickets", ticketId, "replies");
        await addDoc(repliesRef, {
            message: replyText,
            author: 'admin',
            sentAt: serverTimestamp()
        });

        await updateDoc(doc(db, "supportTickets", ticketId), { status: 'in_progress' });
        
        const user = auth.currentUser;
        if (user) {
            const token = await user.getIdToken();
            await fetch('/.netlify/functions/createReplyNotification', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ticketId: ticketId })
            });
        }
        
        replyFormMessage.style.color = 'green';
        replyFormMessage.textContent = 'Reply saved and user notified!';
        replyMessageInput.value = '';
    
    } catch (error) {
        console.error("Error saving reply or notifying:", error);
        replyFormMessage.style.color = 'red';
        replyFormMessage.textContent = 'Failed to save reply.';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Reply';
    }
};

document.addEventListener('adminComponentsLoaded', async () => {
    infoModalCloseBtn.addEventListener('click', hideInfoModal);
    infoModalOkBtn.addEventListener('click', hideInfoModal);
    const urlParams = new URLSearchParams(window.location.search);
    ticketId = urlParams.get('id');
    if (!ticketId) { document.querySelector('.details-grid').innerHTML = '<h2>Error: No ticket ID provided.</h2>'; return; }

    try {
        const ticketRef = doc(db, "supportTickets", ticketId);
        const ticketSnap = await getDoc(ticketRef);
        if (!ticketSnap.exists()) throw new Error('Ticket not found.');
        
        const ticketData = ticketSnap.data();
        let userData = null;

        if (ticketData.userId !== 'guest') {
            const userRef = doc(db, "users", ticketData.userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) userData = userSnap.data();
        }

        renderPage(ticketData, userData);

        const repliesQuery = query(collection(db, "supportTickets", ticketId, "replies"), orderBy("sentAt", "asc"));
        onSnapshot(repliesQuery, (snapshot) => {
            const replies = snapshot.docs.map(doc => doc.data());
            renderConversation(ticketData.message, replies);
        });

        updateStatusBtn.addEventListener('click', updateStatus);
        replyForm.addEventListener('submit', saveReply);
        copyLinkBtn.addEventListener('click', () => {
            guestLinkInput.select();
            document.execCommand('copy');
            copyLinkBtn.textContent = 'Copied!';
            setTimeout(() => { copyLinkBtn.textContent = 'Copy Link'; }, 2000);
        });
    } catch (error) {
        console.error("Error fetching user details:", error);
        document.querySelector('.details-grid').innerHTML = `<h2>Error loading data. Check console for details.</h2><p>${error.message}</p>`;
    }
});