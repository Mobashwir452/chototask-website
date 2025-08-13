// FILE: /admin/js/admin-tickets.js

import { db } from '/js/firebase-config.js';
import { collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- DOM ELEMENTS ---
const filterTabsContainer = document.getElementById('filter-tabs');
const searchInput = document.getElementById('search-input');
const tableBody = document.getElementById('tickets-table-body');

// --- STATE ---
let currentFilter = { type: 'status', value: 'new' }; // Default view

// --- RENDER FUNCTION ---
const renderTable = (tickets) => {
    if (!tableBody) return;
    if (tickets.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="a-empty">No tickets found for this filter.</td></tr>`;
        return;
    }

    tableBody.innerHTML = tickets.map(ticket => {
        const data = ticket.data();
        const date = data.submittedAt ? data.submittedAt.toDate().toLocaleString() : 'N/A';
        const status = data.status || 'new';
        return `
            <tr>
                <td><span class="status-badge ${status.replace(' ', '_')}">${status}</span></td>
                <td>${data.userName} <br><small>${data.userEmail}</small></td>
                <td>${data.subject}</td>
                <td>${data.userRole || 'N/A'}</td>
                <td>${date}</td>
                <td><a href="/admin/support/ticket-details.html?id=${ticket.id}" class="btn btn-dark btn-view">View</a></td>
            </tr>
        `;
    }).join('');
};

// --- DATA FETCHING ---
const fetchTickets = async () => {
    try {
        tableBody.innerHTML = `<tr><td colspan="6" class="a-empty">Loading...</td></tr>`;
        let q = query(collection(db, "supportTickets"), orderBy("submittedAt", "desc"));

        // Apply filter from the active tab
        if (currentFilter.value !== 'all') {
            q = query(q, where(currentFilter.type, "==", currentFilter.value));
        }

        const querySnapshot = await getDocs(q);
        renderTable(querySnapshot.docs);

    } catch (error) {
        console.error("Error fetching tickets:", error);
        tableBody.innerHTML = `<tr><td colspan="6" class="a-empty error">Error: Could not load data.</td></tr>`;
    }
};

// --- EVENT LISTENERS ---
document.addEventListener('adminComponentsLoaded', () => {
    // Initial data load
    fetchTickets();

    // Filter tabs
    filterTabsContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            filterTabsContainer.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');

            currentFilter.type = e.target.dataset.filterBy;
            currentFilter.value = e.target.dataset.filter;
            fetchTickets();
        }
    });

    // Search (basic implementation on enter press)
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            // Note: Firestore does not support native text search.
            // This is a placeholder for an exact match search by email.
            // For full-text search, an external service like Algolia is recommended.
            alert("Search functionality requires an exact email match and is currently in development.");
        }
    });
});