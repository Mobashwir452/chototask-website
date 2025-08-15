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

function setupLogoutButton() {
    const logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm("Are you sure you want to log out?")) {
                try {
                    await signOut(auth);
                    window.location.href = '/login.html';
                } catch (error) { console.error("Error signing out:", error); }
            }
        });
    }
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