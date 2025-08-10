// FILE: /js/client-shell.js (SIMPLIFIED)
import { auth } from '/js/firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
});
