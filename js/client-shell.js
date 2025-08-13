// FILE: /js/client-shell.js (FINAL AND CORRECT)
import { auth, db } from '/js/firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- GLOBAL FUNCTIONS ---

const listenToWallet = (userId) => {
    const headerBalance = document.getElementById('header-balance');
    if (!headerBalance) return; 

    const walletRef = doc(db, "wallets", userId);
    onSnapshot(walletRef, (doc) => {
        const balance = doc.exists() ? (doc.data().balance ?? 0) : 0;
        const formattedBalance = `৳${balance.toLocaleString()}`;
        headerBalance.textContent = formattedBalance;
    });
};

const setActiveNavLink = () => {
    const navContainer = document.getElementById('client-bottom-nav-placeholder');
    if (!navContainer) return;

    const navLinks = navContainer.querySelectorAll('a');
    const currentPath = window.location.pathname;
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const linkPath = new URL(link.href).pathname;
        if (linkPath === currentPath) {
            link.classList.add('active');
        }
    });
};

const setupLogoutButton = () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (confirm("Are you sure you want to log out?")) {
                try {
                    await signOut(auth);
                    window.location.href = '/login.html';
                } catch (error) {
                    console.error("Error signing out:", error);
                }
            }
        });
    }
};

// --- INITIALIZATION LOGIC ---

// This is the main entry point for our global scripts.
// It waits for the user to be authenticated.
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Once the user is known, we then wait for the HTML components to be loaded.
        document.addEventListener('componentsLoaded', () => {
            // This block will now only run when BOTH the user is known AND the DOM is ready.
            listenToWallet(user.uid);
            setActiveNavLink();
            setupLogoutButton();
        });
    } else {
        // If user is not logged in, redirect them.
        const protectedPaths = ['/client/'];
        if (protectedPaths.some(path => window.location.pathname.startsWith(path))) {
            window.location.href = '/login.html';
        }
    }
});