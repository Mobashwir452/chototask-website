// FILE: /js/client-shell.js (FINAL, ROBUST VERSION)
import { auth, db } from '/js/firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- CHECKLIST AND GUARD ---
let isUserReady = false;
let areComponentsReady = false;
let didGlobalScriptsRun = false;
let currentUserId = null;

// This function will contain all logic that needs both user and DOM
function runGlobalScripts() {
    // Guard: Only run if both are ready AND it hasn't run before.
    if (!isUserReady || !areComponentsReady || didGlobalScriptsRun) {
        return;
    }
    
    // Mark as run to prevent it from running again.
    didGlobalScriptsRun = true;

    // --- All global functions are called here safely ---
    listenToWallet(currentUserId);
    setActiveNavLink();
    setupLogoutButton();
}


// --- GLOBAL FUNCTIONS ---

function listenToWallet(userId) {
    const headerBalance = document.getElementById('header-balance');
    if (!headerBalance) {
        console.error("Header balance element not found!");
        return;
    }

    const walletRef = doc(db, "wallets", userId);
    onSnapshot(walletRef, (doc) => {
        const balance = doc.exists() ? (doc.data().balance ?? 0) : 0;
        const formattedBalance = `৳${balance.toLocaleString()}`;
        headerBalance.textContent = formattedBalance;
    });
}

function setActiveNavLink() {
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
}

function setupLogoutButton() {
    // Your `client-menu.html` doesn't have an element with id="logout-btn".
    // It has a link with class="btn-logout". We'll target that instead.
    const logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault(); // Prevent the link from navigating to "/logout"
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
}

// --- INITIALIZATION TRIGGERS ---

// Trigger 1: Firebase Authentication
onAuthStateChanged(auth, (user) => {
    if (user) {
        isUserReady = true;
        currentUserId = user.uid;
        runGlobalScripts(); // Attempt to run
    } else {
        const protectedPaths = ['/client/'];
        if (protectedPaths.some(path => window.location.pathname.startsWith(path))) {
            window.location.href = '/login.html';
        }
    }
});

// Trigger 2: HTML Components Loaded
document.addEventListener('componentsLoaded', () => {
    areComponentsReady = true;
    runGlobalScripts(); // Attempt to run
});