// FILE: /js/client-shell.js (FINAL, ROBUST VERSION)
import { auth, db } from '/js/firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, onSnapshot, getDoc, updateDoc, serverTimestamp, collection, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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
    listenForNotifications(currentUserId); 
}


// --- GLOBAL FUNCTIONS ---

function listenToWallet(userId) {
    const headerBalance = document.getElementById('header-balance');
    // ✅ ADD THIS LINE to find the balance element on the billing page.
    const pageBalance = document.getElementById('current-balance'); 

    if (!userId) return;
    const walletRef = doc(db, "wallets", userId);
    
    onSnapshot(walletRef, (doc) => {
        const balance = doc.exists() ? (doc.data().balance ?? 0) : 0;
        const formattedBalance = `৳${balance.toLocaleString()}`;
        
        // Update the header balance if it exists.
        if (headerBalance) {
            headerBalance.textContent = formattedBalance;
        }
        // ✅ ADD THIS LINE to update the page balance if it exists.
        if (pageBalance) {
            pageBalance.textContent = formattedBalance;
        }
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

// ✅ REPLACED LOGOUT FUNCTION
function setupLogoutButton() {
    const logoutBtn = document.querySelector('.btn-logout');
    const logoutModal = document.getElementById('logout-confirmation-modal');
    
    if (!logoutBtn || !logoutModal) return;

    const confirmBtn = logoutModal.querySelector('#logout-confirm-btn');
    const cancelBtn = logoutModal.querySelector('#logout-cancel-btn');

    // When the main logout button is clicked, close menu and show modal
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // This closes the client side menu
        document.getElementById('client-menu-toggle').checked = false;

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
            logoutModal.classList.remove('is-visible');
        }
    });
}


// --- NOTIFICATION SYSTEM ---

function listenForNotifications(userId) {
    const notificationBtn = document.getElementById('notification-btn');
    const notificationCountBadge = document.getElementById('notification-count');
    const notificationPanel = document.getElementById('notification-panel');

    if (!userId || !notificationBtn) return;

    let unreadListener, recentListener;

    const markNotificationsAsRead = async () => {
        const userRef = doc(db, "users", userId);
        try {
            await updateDoc(userRef, { lastCheckedNotifications: serverTimestamp() });
        } catch (error) { console.error("Error marking notifications as read:", error); }
    };

    const renderNotificationPanel = (activities) => {
        const notificationList = document.getElementById('notification-list');
        if (!notificationList) return;
        if (activities.length === 0) {
            notificationList.innerHTML = `<p class="notification-placeholder">No new notifications</p>`;
            return;
        }
        notificationList.innerHTML = activities.map(activity => {
            const timestamp = activity.timestamp ? timeAgo(activity.timestamp.toDate()) : '';
            const tag = activity.refLink ? 'a' : 'div';
            const href = activity.refLink ? `href="${activity.refLink}"` : '';
            
            return `
                <${tag} ${href} class="notification-item">
                    <div class="notification-item__icon"><i class="fa-solid fa-bell"></i></div>
                    <div class="notification-item__content">
                        <p class="notification-item__message">${activity.text || activity.message}</p>
                        <p class="notification-item__timestamp">${timestamp}</p>
                    </div>
                </${tag}>
            `;
        }).join('');
    };

    const setupListeners = async () => {
        if (unreadListener) unreadListener();
        if (recentListener) recentListener();

        const userDocRef = doc(db, "users", userId);
        const userDoc = await getDoc(userDocRef);
        const lastChecked = userDoc.exists() ? userDoc.data().lastCheckedNotifications : null;

        const unreadQuery = lastChecked 
            ? query(collection(db, "activities"), where("userId", "==", userId), where("timestamp", ">", lastChecked))
            : query(collection(db, "activities"), where("userId", "==", userId));

        unreadListener = onSnapshot(unreadQuery, (snapshot) => {
            const count = snapshot.size;
            if (notificationCountBadge) {
                if (count > 0) {
                    notificationCountBadge.textContent = count > 9 ? '9+' : count;
                    notificationCountBadge.style.display = 'flex';
                } else {
                    notificationCountBadge.style.display = 'none';
                }
            }
        });

        const recentQuery = query(collection(db, "activities"), where("userId", "==", userId), orderBy("timestamp", "desc"), limit(5));
        recentListener = onSnapshot(recentQuery, (snapshot) => {
            const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderNotificationPanel(activities);
        });
    };

notificationBtn.addEventListener('click', (e) => {
    e.preventDefault();
    // ✅ FIX: Re-select the panel here and check if it exists before using it.
    const panel = document.getElementById('notification-panel');
    if (panel) {
        const isVisible = panel.classList.toggle('visible');
        if (isVisible && notificationCountBadge.style.display !== 'none') {
            // Pass the current user's ID to the function
            markNotificationsAsRead(auth.currentUser.uid);
        }
    } else {
        console.error("Notification panel element not found in the DOM.");
    }
});

    // Helper for relative time
    function timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000; if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000; if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400; if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600; if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60; if (interval > 1) return Math.floor(interval) + "m ago";
        return "Just now";
    }

    setupListeners();
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



/* === Add Favicon to All Worker Pages === */
(function() {
    const faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    faviconLink.type = 'image/png';
    faviconLink.href = '/Logo/Logo1.png'; // আপনার লোগোর সঠিক পাথ
    document.head.appendChild(faviconLink);
})();

/* === Your existing worker-shell.js code continues below === */
// ... (আপনার বাকি কোড) ...