// FILE: /js/admin-users.js (REVISED)
import { db } from '/js/firebase-config.js';
import { collection, query, orderBy, getDocs, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- DOM ELEMENTS ---
const tbody = document.getElementById('tbody-users');
const searchInput = document.getElementById('user-search');
const tabContainer = document.querySelector('.a-tabs');
const adminModal = document.getElementById('admin-modal');
const modalTitle = document.getElementById('admin-modal-title');
const modalBody = document.getElementById('admin-modal-body');
const modalCloseBtn = document.getElementById('admin-modal-close-btn');

// --- STATE ---
let allUsers = []; // This will store all users fetched from Firestore to avoid re-fetching


// --- MODAL CONTROLS ---
const showAdminModal = () => adminModal.style.display = 'flex';
const hideAdminModal = () => adminModal.style.display = 'none';
modalCloseBtn.addEventListener('click', hideAdminModal);
adminModal.addEventListener('click', (e) => {
    if (e.target === adminModal) hideAdminModal();
});




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

// --- ACTION HANDLERS ---
// EDIT

const handleEdit = async (userId) => {
    const user = allUsers.find(u => u.uid === userId);
    modalTitle.textContent = `Edit User: ${user.fullName}`;
    modalBody.innerHTML = `
        <form id="edit-user-form">
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="edit-fullName" class="form-control" value="${user.fullName}">
            </div>
            <div class="form-group">
                <label>Role</label>
                <select id="edit-role" class="form-control">
                    <option value="worker" ${user.role === 'worker' ? 'selected' : ''}>Worker</option>
                    <option value="client" ${user.role === 'client' ? 'selected' : ''}>Client</option>
                </select>
            </div>
            <div class="a-modal-footer">
                <button type="button" class="btn btn-outline" id="edit-cancel-btn">Cancel</button>
                <button type="submit" class="btn btn-dark">Save Changes</button>
            </div>
        </form>
    `;
    showAdminModal();

    document.getElementById('edit-cancel-btn').addEventListener('click', hideAdminModal);
    document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newFullName = document.getElementById('edit-fullName').value;
        const newRole = document.getElementById('edit-role').value;
        
        await updateDoc(doc(db, "users", userId), { fullName: newFullName, role: newRole });
        
        // Update local data and re-render
        user.fullName = newFullName;
        user.role = newRole;
        filterAndRender();
        hideAdminModal();
    });
};



// SUSPEND
const handleSuspend = (userId) => {
    const user = allUsers.find(u => u.uid === userId);
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    modalTitle.textContent = `${newStatus === 'active' ? 'Reactivate' : 'Suspend'} User`;
    modalBody.innerHTML = `
        <p>Are you sure you want to change this user's status to <strong>${newStatus}</strong>?</p>
        <div class="a-modal-footer">
            <button type="button" class="btn btn-outline" id="suspend-cancel-btn">Cancel</button>
            <button type="button" class="btn btn-dark" id="suspend-confirm-btn">Confirm</button>
        </div>
    `;
    showAdminModal();

    document.getElementById('suspend-cancel-btn').addEventListener('click', hideAdminModal);
    document.getElementById('suspend-confirm-btn').addEventListener('click', async () => {
        await updateDoc(doc(db, "users", userId), { status: newStatus });
        user.status = newStatus;
        filterAndRender();
        hideAdminModal();
    });
};



// DELETE
const handleDelete = (userId) => {
    modalTitle.textContent = 'Delete User';
    modalBody.innerHTML = `
        <p><strong>Warning:</strong> This is a dangerous action.</p>
        <p>For security, deleting a user completely requires a backend function. This action will perform a "soft delete" by changing their status to 'deleted', which hides them from the system. Are you sure you want to proceed?</p>
        <div class="a-modal-footer">
            <button type="button" class="btn btn-outline" id="delete-cancel-btn">Cancel</button>
            <button type="button" class="btn btn-danger" id="delete-confirm-btn">Yes, Soft Delete</button>
        </div>
    `;
    showAdminModal();

    document.getElementById('delete-cancel-btn').addEventListener('click', hideAdminModal);
    document.getElementById('delete-confirm-btn').addEventListener('click', async () => {
        // This is a "soft delete". A true delete needs a backend function.
        await updateDoc(doc(db, "users", userId), { status: 'deleted' });
        
        // Remove from the view
        allUsers = allUsers.filter(u => u.uid !== userId);
        filterAndRender();
        hideAdminModal();
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

// --- MAIN EVENT LISTENER FOR ACTIONS ---
tbody.addEventListener('click', (e) => {
    const actionButton = e.target.closest('.a-action-btn');
    if (!actionButton) return;

    const userId = actionButton.dataset.userid;

    if (actionButton.classList.contains('edit')) {
        handleEdit(userId);
    } else if (actionButton.classList.contains('ban')) {
        handleSuspend(userId);
    } else if (actionButton.classList.contains('delete')) {
        handleDelete(userId);
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