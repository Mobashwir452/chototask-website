// FILE: /js/client-shell.js (FINAL UPDATED VERSION)
import { auth } from '/js/firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/**
 * ✅ NEW FUNCTION
 * This function finds the active page and highlights its link in the navigation bar.
 */
function setActiveNavLink() {
    // This ID should match the placeholder div for your bottom navigation bar
    const navContainer = document.getElementById('client-bottom-nav-placeholder');
    if (!navContainer) return;

    const navLinks = navContainer.querySelectorAll('a');
    const currentPath = window.location.pathname;

    navLinks.forEach(link => {
        // Remove 'active' class from all links first to reset the state
        link.classList.remove('active');

        // Get the pathname from the link's href (e.g., "/client/billing.html")
        const linkPath = new URL(link.href).pathname;

        // If the link's path matches the current page's path, it's the active one
        if (linkPath === currentPath) {
            link.classList.add('active');
        }
    });
}


// This event ensures the component HTML is loaded first.
document.addEventListener('componentsLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (confirm("Are you sure you want to log out?")) {
                try {
                    await signOut(auth);
                    window.location.href = '/login.html';
                } catch (error) {
                    console.error("Error signing out:", error);
                    alert("Failed to sign out. Please try again.");
                }
            }
        });
    }

    // ✅ Call the new function here to set the active link after components are loaded
    setActiveNavLink();
});