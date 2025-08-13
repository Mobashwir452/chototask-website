// FILE: /client/js/client-my-tickets.js
import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('componentsLoaded', () => {
    const listContainer = document.getElementById('tickets-list-container');
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const q = query(
                collection(db, "supportTickets"),
                where("userId", "==", user.uid),
                orderBy("submittedAt", "desc")
            );
            onSnapshot(q, (snapshot) => {
                if (snapshot.empty) {
                    listContainer.innerHTML = `<p class="empty-state">You have not submitted any support tickets.</p>`;
                    return;
                }
                listContainer.innerHTML = snapshot.docs.map(doc => {
                    const ticket = doc.data();
                    const status = ticket.status.replace(' ', '_');
                    return `
                        <a href="/client/ticket-details.html?id=${doc.id}" class="ticket-list-item">
                            <div class="ticket-info">
                                <h4>${ticket.subject}</h4>
                                <p>Last updated: ${ticket.submittedAt.toDate().toLocaleString()}</p>
                            </div>
                            <div class="ticket-status-badge status-${status}">${ticket.status}</div>
                        </a>
                    `;
                }).join('');
            });
        } else { window.location.href = '/login.html'; }
    });
});