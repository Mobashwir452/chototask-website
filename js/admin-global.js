/* FILE: js/admin-global.js (Final, Corrected Version) */

import { auth } from './firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { db } from './firebase-config.js';
import { collection, query, where, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


// --- 1. COMPONENT LOADER ---
const loadAdminComponents = async () => {
    const components = {
        '#admin-sidebar-placeholder': '../components/admin-sidebar.html',
        '#admin-header-placeholder': '../components/admin-header.html',
    };

    // Use Promise.all to fetch all components in parallel for better performance
    await Promise.all(Object.entries(components).map(async ([id, url]) => {
        const placeholder = document.querySelector(id);
        if (placeholder) {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Failed to load component: ${url}`);
                const html = await response.text();
                placeholder.innerHTML = html;
            } catch (error) {
                console.error(`Error loading component for ${id}:`, error);
                placeholder.innerHTML = `<p style="color: red;">Could not load component.</p>`;
            }
        }
    }));

    // After all components are loaded, dispatch a custom event
    document.dispatchEvent(new CustomEvent('adminComponentsLoaded'));
};


// --- 2. REAL-TIME NOTIFICATION LISTENER ---
function listenForNewMessages() {
    // Wait for components to be loaded before finding these elements
    document.addEventListener('adminComponentsLoaded', () => {
        const notificationBadge = document.querySelector('.notification-badge');
        const notificationList = document.getElementById('notification-list');

        if (!notificationBadge || !notificationList) return;

        const q = query(collection(db, "contact_submissions"), where("status", "==", "new"), orderBy("timestamp", "desc"));

        onSnapshot(q, (snapshot) => {
            const newMessagesCount = snapshot.size;

            if (newMessagesCount > 0) {
                notificationBadge.textContent = newMessagesCount;
                notificationBadge.classList.add('is-visible');
            } else {
                notificationBadge.classList.remove('is-visible');
            }

            notificationList.innerHTML = '';

            if (snapshot.empty) {
                notificationList.innerHTML = '<div class="notification-item-empty">No new notifications</div>';
            } else {
                snapshot.forEach(doc => {
                    const message = doc.data();
                    const item = document.createElement('a');
                    item.href = `/admin/messages.html#${doc.id}`;
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
    });
}


// --- 3. PAGE INITIALIZATION ---
const initializeAdminPage = () => {
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
document.addEventListener('DOMContentLoaded', () => {
    loadAdminComponents(); // Load components first
    listenForNewMessages(); // Start listening for notifications
});

// Initialize interactions after the components are ready
document.addEventListener('adminComponentsLoaded', initializeAdminPage);