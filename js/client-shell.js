// FILE: /js/client-shell.js (DEBUGGING VERSION)
import { auth } from '/js/firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

function setActiveNavLink() {
    const navContainer = document.getElementById('client-bottom-nav-placeholder');
    if (!navContainer) return;

    const navLinks = navContainer.querySelectorAll('a');
    const currentURL = window.location.href; // Use the full URL for a more reliable check

    let bestMatch = null;

    navLinks.forEach(link => {
        link.classList.remove('active');
        // Check if the current page URL starts with the link's URL.
        // This correctly handles cases like '/billing' and '/billing.html'
        if (currentURL.startsWith(link.href)) {
            bestMatch = link;
        }
    });
    
    // Sometimes the root dashboard link ('/') can match everything.
    // This part ensures we're not highlighting the dashboard on other pages.
    // We check if another, more specific link was also a match.
    if (bestMatch && bestMatch.getAttribute('href') === '/client/index.html' && window.location.pathname !== '/client/index.html' && window.location.pathname !== '/client/') {
        // A more specific link should be found, so don't activate the dashboard.
        // This is a safety check. The logic below is the main fix.
    } else if (bestMatch) {
         bestMatch.classList.add('active');
    }

    // A simpler, very effective alternative if the above is complex:
    // Find a link whose href is contained within the current URL.
    let activeLink = Array.from(navLinks).find(link => window.location.pathname.includes(link.getAttribute('href')));
    if (activeLink) {
        activeLink.classList.add('active');
    }
}


document.addEventListener('componentsLoaded', () => {
    console.log("componentsLoaded event fired."); // <-- Check if the event fires

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