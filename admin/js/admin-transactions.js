// FILE: /admin/js/admin-transactions.js

import { db } from '/js/firebase-config.js';
import { collection, query, where, orderBy, limit, getDocs, startAfter, endBefore, limitToLast } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- DOM ELEMENTS ---
const searchEmailInput = document.getElementById('search-email');
const filterTypeSelect = document.getElementById('filter-type');
const filterStatusSelect = document.getElementById('filter-status');
const filterBtn = document.getElementById('filter-btn');
const tableBody = document.getElementById('tbody-transactions');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

// --- STATE MANAGEMENT ---
const PAGE_SIZE = 15;
let firstVisibleDoc = null;
let lastVisibleDoc = null;
let currentPageQuery = null;

// --- RENDER FUNCTION ---
const renderTable = (docs) => {
    if (!tableBody) return;
    if (docs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="a-empty">No transactions found for the current filters.</td></tr>`;
        return;
    }
    tableBody.innerHTML = docs.map(doc => {
        const data = doc.data();
        const date = data.createdAt ? data.createdAt.toDate().toLocaleString() : 'N/A';
        const amount = data.amount || 0;
        return `
            <tr>
                <td>${date}</td>
                <td>${data.clientEmail || data.clientId}</td>
                <td>${data.type || 'N/A'}</td>
                <td class="status-cell" data-status="${data.status || ''}">${data.status || 'N/A'}</td>
                <td style="text-align: right;">৳${amount.toLocaleString()}</td>
            </tr>
        `;
    }).join('');
};

// --- DATA FETCHING ---
const fetchTransactions = async (direction = 'first') => {
    try {
        tableBody.innerHTML = `<tr><td colspan="5" class="a-empty">Loading...</td></tr>`;

        let q = query(
            collection(db, "transactions"),
            orderBy("createdAt", "desc")
        );
        
        // Apply filters
        const email = searchEmailInput.value.trim();
        const type = filterTypeSelect.value;
        const status = filterStatusSelect.value;
        if (email) q = query(q, where("clientEmail", "==", email));
        if (type) q = query(q, where("type", "==", type));
        if (status) q = query(q, where("status", "==", status));

        // Apply pagination
        if (direction === 'next' && lastVisibleDoc) {
            q = query(q, startAfter(lastVisibleDoc), limit(PAGE_SIZE));
        } else if (direction === 'prev' && firstVisibleDoc) {
            q = query(q, endBefore(firstVisibleDoc), limitToLast(PAGE_SIZE));
        } else {
            q = query(q, limit(PAGE_SIZE));
        }

        currentPageQuery = q; // Store the current query
        const querySnapshot = await getDocs(currentPageQuery);
        const transactionDocs = querySnapshot.docs;
        
        renderTable(transactionDocs);

        // Update pagination state
        firstVisibleDoc = transactionDocs[0] || null;
        lastVisibleDoc = transactionDocs[transactionDocs.length - 1] || null;
        
        nextBtn.disabled = transactionDocs.length < PAGE_SIZE;
        prevBtn.disabled = direction === 'first'; // Simplified: enable prev only after going next

    } catch (error) {
        console.error("Error fetching transactions:", error);
        tableBody.innerHTML = `<tr><td colspan="5" class="a-empty error">Error: Could not load data.</td></tr>`;
    }
};

// --- EVENT LISTENERS ---
document.addEventListener('adminComponentsLoaded', () => {
    fetchTransactions(); // Initial data load

    filterBtn.addEventListener('click', () => fetchTransactions('first'));
    nextBtn.addEventListener('click', () => {
        fetchTransactions('next');
        prevBtn.disabled = false;
    });
    prevBtn.addEventListener('click', () => {
        fetchTransactions('prev');
        nextBtn.disabled = false;
    });
});