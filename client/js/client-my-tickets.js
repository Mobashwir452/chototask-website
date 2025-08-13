// FILE: /client/js/client-my-tickets.js (FINAL, UPDATED VERSION)

import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('componentsLoaded', () => {
    const listContainer = document.getElementById('tickets-list-container');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    let currentUserId = null;
    let ticketsUnsubscribe = null;

    const renderTickets = (docs) => {
        if (docs.length === 0) {
            listContainer.innerHTML = `<p class="empty-state">No support tickets found for this filter.</p>`;
            return;
        }
        listContainer.innerHTML = docs.map(doc => {
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
    };

    const fetchTickets = (filterStatus = 'all') => {
        if (!currentUserId) return;
        if (ticketsUnsubscribe) ticketsUnsubscribe(); // Unsubscribe from old listener

        let q = query(
            collection(db, "supportTickets"),
            where("userId", "==", currentUserId),
            orderBy("submittedAt", "desc")
        );

        // Add the status filter if it's not 'all'
        if (filterStatus !== 'all') {
            q = query(q, where("status", "==", filterStatus));
        }

        ticketsUnsubscribe = onSnapshot(q, (snapshot) => {
            renderTickets(snapshot.docs);
        }, (error) => {
            console.error("Error fetching tickets:", error);
            listContainer.innerHTML = `<p class="empty-state error">Could not load tickets.</p>`;
        });
    };

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const filter = button.dataset.filter;
            fetchTickets(filter);
        });
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            fetchTickets('all'); // Fetch all tickets on initial load
        } else { 
            window.location.href = '/login.html'; 
        }
    });
});