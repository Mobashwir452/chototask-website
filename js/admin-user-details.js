// FILE: /js/admin-user-details.js
import { db } from '/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const container = document.getElementById('user-details-container');

const renderUserDetails = (user, wallet) => {
    const joinedDate = user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleString() : 'N/A';
    
    const html = `
        <div class="a-breadcrumbs"><a href="/admin/users.html">Users</a> / ${user.fullName}</div>
        <div class="a-card">
            <h3>User Information</h3>
            <p><strong>Full Name:</strong> ${user.fullName}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Role:</strong> ${user.role}</p>
            <p><strong>Status:</strong> ${user.status}</p>
            <p><strong>Joined:</strong> ${joinedDate}</p>
        </div>
        <div class="a-card" style="margin-top: 1rem;">
            <h3>Wallet Details</h3>
            <p><strong>Balance:</strong> ${wallet.currency} ${wallet.balance.toFixed(2)}</p>
            <p><strong>Total Earned:</strong> ${wallet.currency} ${wallet.totalEarned.toFixed(2)}</p>
            <p><strong>Total Spent:</strong> ${wallet.currency} ${wallet.totalSpent.toFixed(2)}</p>
            <p><strong>Last Updated:</strong> ${wallet.lastUpdated ? new Date(wallet.lastUpdated.seconds * 1000).toLocaleString() : 'N/A'}</p>
        </div>
    `;
    container.innerHTML = html;
};

// --- Initial Load ---
(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    if (!userId) {
        container.innerHTML = '<div class="a-card"><h2>Error: No user ID provided.</h2></div>';
        return;
    }

    try {
        const userDocRef = doc(db, "users", userId);
        const walletDocRef = doc(db, "wallets", userId);

        const [userDoc, walletDoc] = await Promise.all([getDoc(userDocRef), getDoc(walletDocRef)]);

        if (userDoc.exists() && walletDoc.exists()) {
            renderUserDetails(userDoc.data(), walletDoc.data());
        } else {
            container.innerHTML = '<div class="a-card"><h2>Error: User data not found.</h2></div>';
        }
    } catch (error) {
        console.error("Error fetching user details:", error);
        container.innerHTML = '<div class="a-card"><h2>Error loading user data.</h2></div>';
    }
})();