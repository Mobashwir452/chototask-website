// FILE: js/admin-global.js (Final Version)

import { db, auth } from './firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. COMPONENT LOADER ---
const loadAdminComponents = async () => {
    // ... (This function remains the same as before)
};

// --- 2. REAL-TIME NOTIFICATION LISTENER ---
function listenForNewMessages() {
    const notificationBadge = document.querySelector('.notification-badge');
    const notificationList = document.getElementById('notification-list');

    if (!notificationBadge || !notificationList) return;

    // Create a query to listen for ONLY new messages, newest first
    const q = query(collection(db, "contact_submissions"), where("status", "==", "new"), orderBy("timestamp", "desc"));

    onSnapshot(q, (snapshot) => {
        const newMessagesCount = snapshot.size;

        // Update the badge visibility and count
        if (newMessagesCount > 0) {
            notificationBadge.textContent = newMessagesCount;
            notificationBadge.classList.add('is-visible');
        } else {
            notificationBadge.classList.remove('is-visible');
        }

        // Clear the current list
        notificationList.innerHTML = '';

        // Populate the dropdown with new notifications
        if (snapshot.empty) {
            notificationList.innerHTML = '<div class="notification-item-empty">No new notifications</div>';
        } else {
            snapshot.forEach(doc => {
                const message = doc.data();
                const item = document.createElement('a');
                item.href = `/admin/messages.html#${doc.id}`; // This will help us find the message later
                item.className = 'notification-item';
                
                const time = message.timestamp ? message.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                item.innerHTML = `
                    <div class="item-icon"><i class="fa-solid fa-envelope"></i></div>
                    <div class="item-content">
                        <p>New message from <strong>${message.name}</strong></p>
                        <small>${time}</small>
                    </div>
                `;
                notificationList.appendChild(item);
            });
        }
    });
}


// --- 3. PAGE INITIALIZATION ---
const initializeAdminPage = () => {
    // Notification Dropdown Toggle
    const notificationBtn = document.getElementById('notification-btn');
    const notificationDropdown = document.getElementById('notification-dropdown');

    if (notificationBtn && notificationDropdown) {
        notificationBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            notificationDropdown.classList.toggle('show');
        });
    }
    window.addEventListener('click', (event) => {
        if (notificationDropdown && !notificationDropdown.contains(event.target) && !notificationBtn.contains(event.target)) {
            notificationDropdown.classList.remove('show');
        }
    });

    // Logout Functionality
    const logoutButton = document.getElementById('admin-logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            signOut(auth).then(() => {
                window.location.href = '/admin/login.html';
            });
        });
    }
};

// --- 4. SCRIPT EXECUTION ---
document.addEventListener('DOMContentLoaded', loadAdminComponents);
document.addEventListener('adminComponentsLoaded', () => {
    initializeAdminPage();
    listenForNewMessages(); // Start listening for notifications
});