// FILE: /js/admin-users.js (REVISED)
import { db } from '/js/firebase-config.js';
import { collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- DOM ELEMENTS ---
const tbody = document.getElementById('tbody-users');
const searchInput = document.getElementById('user-search');
const tabContainer = document.querySelector('.a-tabs');

// --- STATE ---
let allUsers = []; // This will store all users fetched from Firestore to avoid re-fetching

// --- RENDER FUNCTION ---
// Renders a given list of users into the table
const renderUsers = (users) => {
    tbody.innerHTML = ''; // Clear existing rows
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="a-empty">No users match your criteria.</td></tr>';
        return;
    }

    users.forEach(user => {
        const joinedDate = user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';
        const roleClass = user.role === 'worker' ? 'live' : 'pending';
        const roleText = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        const statusClass = user.status === 'active' ? 'live' : 'rejected';

        // Note: The action buttons have data attributes to hold the user's ID
        const row = `
        <tr>
          <td>${user.fullName || 'N/A'}</td>
          <td>${user.email}</td>
          <td><span class="status ${roleClass}">${roleText}</span></td>
          <td>${joinedDate}</td>
          <td><span class="status ${statusClass}">${user.status}</span></td>
          <td class="a-actions">
            <a href="/admin/user-details.html?id=${user.uid}" class="a-action-btn view" title="View Details"><i class="fa-solid fa-eye"></i></a>
            <button class="a-action-btn edit" data-userid="${user.uid}" title="Edit User"><i class="fa-solid fa-pencil"></i></button>
            <button class="a-action-btn ban" data-userid="${user.uid}" title="Suspend User"><i class="fa-solid fa-ban"></i></button>
            <button class="a-action-btn delete" data-userid="${user.uid}" title="Delete User"><i class="fa-solid fa-trash-can"></i></button>
          </td>
        </tr>`;
        tbody.insertAdjacentHTML('beforeend', row);
    });
};

// --- FILTER & SEARCH LOGIC ---
const filterAndRender = () => {
    const searchTerm = searchInput.value.toLowerCase();
    const activeRole = tabContainer.querySelector('.active').dataset.role;

    let usersToRender = allUsers;

    // 1. Filter by the active tab
    if (activeRole !== 'all') {
        usersToRender = usersToRender.filter(user => user.role === activeRole);
    }

    // 2. Filter by the search term
    if (searchTerm) {
        usersToRender = usersToRender.filter(user => 
            (user.fullName && user.fullName.toLowerCase().includes(searchTerm)) || 
            user.email.toLowerCase().includes(searchTerm)
        );
    }

    renderUsers(usersToRender);
};

// --- EVENT LISTENERS ---
// Listen for clicks on the tabs
tabContainer.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        tabContainer.querySelector('.active').classList.remove('active');
        e.target.classList.add('active');
        filterAndRender(); // Re-render the table based on the new active tab
    }
});

// Listen for input in the search bar
searchInput.addEventListener('input', filterAndRender);

// Placeholder for action button clicks
tbody.addEventListener('click', (e) => {
    const actionButton = e.target.closest('.a-action-btn');
    if (!actionButton) return;

    const userId = actionButton.dataset.userid;

    if (actionButton.classList.contains('edit')) {
        alert(`EDIT action for user ID: ${userId}. You would open a modal here.`);
    } else if (actionButton.classList.contains('ban')) {
        alert(`SUSPEND action for user ID: ${userId}. You would update their status in Firestore.`);
    } else if (actionButton.classList.contains('delete')) {
        if (confirm(`Are you sure you want to DELETE user ID: ${userId}? This cannot be undone.`)) {
            alert('This would trigger a secure delete function.');
        }
    }
});

// --- INITIAL DATA LOAD ---
// Fetch all users from Firestore when the page loads
(async () => {
    try {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        allUsers = querySnapshot.docs.map(doc => doc.data());
        renderUsers(allUsers); // Initial render with all users
    } catch (error) {
        console.error("Error fetching users:", error);
        tbody.innerHTML = '<tr><td colspan="6" class="a-empty">Error loading users.</td></tr>';
    }
})();