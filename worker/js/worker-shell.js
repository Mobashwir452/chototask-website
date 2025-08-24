// FILE: /worker/js/worker-shell.js

import { auth, db } from '/js/firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, onSnapshot, getDoc, updateDoc, serverTimestamp, collection, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- CHECKLIST AND GUARD ---
let isUserReady = false;
let areComponentsReady = false;
let didGlobalScriptsRun = false;
let currentUserId = null;

function runGlobalScripts() {
    if (!isUserReady || !areComponentsReady || didGlobalScriptsRun) return;
    didGlobalScriptsRun = true;
    listenToWallet(currentUserId);
    setActiveNavLink();
    setupLogoutButton();
    // listenForNotifications(currentUserId); // Can be enabled later
}

// --- GLOBAL FUNCTIONS ---
function listenToWallet(userId) {
    const headerBalance = document.getElementById('header-balance');
    if (!userId || !headerBalance) return;
    onSnapshot(doc(db, "wallets", userId), (doc) => {
        const balance = doc.exists() ? (doc.data().balance ?? 0) : 0;
        headerBalance.textContent = `৳${balance.toLocaleString()}`;
    });
}

function setActiveNavLink() {
    const navContainer = document.querySelector('.client-bottom-nav');
    if (!navContainer) return;
    const navLinks = navContainer.querySelectorAll('a.bottom-nav__link');
    const currentPath = window.location.pathname;
    navLinks.forEach(link => {
        link.classList.remove('active');
        const linkPath = new URL(link.href).pathname;
        if (linkPath === currentPath) {
            link.classList.add('active');
        }
    });
}

// ✅ REPLACED LOGOUT FUNCTION
function setupLogoutButton() {
    const logoutBtn = document.querySelector('.btn-logout');
    const logoutModal = document.getElementById('logout-confirmation-modal');
    
    if (!logoutBtn || !logoutModal) return;

    const confirmBtn = logoutModal.querySelector('#logout-confirm-btn');
    const cancelBtn = logoutModal.querySelector('#logout-cancel-btn');

    // When the main logout button is clicked, show the modal
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();

        // ✅ FIX: This line finds the menu's checkbox and unchecks it, closing the menu.
        document.getElementById('worker-menu-toggle').checked = false;

        logoutModal.classList.add('is-visible');
    });

    // When the "Cancel" button inside the modal is clicked, hide it
    cancelBtn.addEventListener('click', () => {
        logoutModal.classList.remove('is-visible');
    });

    // When the final "Logout" button is clicked, perform the sign out
    confirmBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = '/login.html';
        } catch (error) {
            console.error("Error signing out:", error);
            logoutModal.classList.remove('is-visible'); // Hide modal on error
        }
    });
}


// NOTE: Notification system can be copied here from client-shell.js if needed

// --- INITIALIZATION TRIGGERS ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        isUserReady = true;
        currentUserId = user.uid;
        runGlobalScripts();
    } else {
        const protectedPaths = ['/worker/'];
        if (protectedPaths.some(path => window.location.pathname.startsWith(path))) {
            window.location.href = '/login.html';
        }
    }
});

document.addEventListener('componentsLoaded', () => {
    areComponentsReady = true;
    runGlobalScripts();
});