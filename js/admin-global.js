// FILE: js/admin-global.js (Updated)

import { auth } from './firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// This function loads reusable components for the admin panel
const loadAdminComponents = async () => {
    const components = {
        '#admin-sidebar-placeholder': '../components/admin-sidebar.html',
        '#admin-header-placeholder': '../components/admin-header.html',
    };

    await Promise.all(Object.entries(components).map(async ([id, url]) => {
        const placeholder = document.querySelector(id);
        if (placeholder) {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Failed to load: ${url}`);
                const html = await response.text();
                placeholder.innerHTML = html;
            } catch (error) {
                console.error(`Error loading component for ${id}:`, error);
            }
        }
    }));
    
    // After components are loaded, dispatch an event
    document.dispatchEvent(new Event('adminComponentsLoaded'));
};

// This function initializes event listeners after components are ready
const initializeAdminPage = () => {
    // --- Sidebar Toggle Functionality ---
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const adminWrapper = document.getElementById('admin-wrapper');

    if (toggleBtn && adminWrapper) {
        toggleBtn.addEventListener('click', () => {
            adminWrapper.classList.toggle('sidebar-collapsed');
        });
    }
    
    // --- Notification Dropdown Functionality ---
    const notificationBtn = document.getElementById('notification-btn');
    const notificationDropdown = document.getElementById('notification-dropdown');

    if (notificationBtn && notificationDropdown) {
        notificationBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevents the window click listener from firing immediately
            notificationDropdown.classList.toggle('show');
        });
    }

    // Close dropdown if clicked outside
    window.addEventListener('click', (event) => {
        if (notificationDropdown && !notificationDropdown.contains(event.target) && !notificationBtn.contains(event.target)) {
            notificationDropdown.classList.remove('show');
        }
    });

    // --- Logout Functionality ---
    const logoutButton = document.getElementById('admin-logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            signOut(auth).then(() => {
                console.log("Admin logged out successfully.");
                window.location.href = '/admin/login.html';
            }).catch((error) => {
                console.error("Logout error:", error);
            });
        });
    }
};

// Run the component loader as soon as the DOM is ready
document.addEventListener('DOMContentLoaded', loadAdminComponents);
// Run the initializations after the components have been loaded
document.addEventListener('adminComponentsLoaded', initializeAdminPage);
