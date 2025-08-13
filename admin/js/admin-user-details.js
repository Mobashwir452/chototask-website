// FILE: /admin/js/admin-user-details.js (FINAL UPDATED VERSION)
import { db } from '/js/firebase-config.js';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const detailsCard = document.getElementById('details-card');
const breadcrumbs = document.querySelector('.a-breadcrumbs');
const CURRENCY_SYMBOL = '৳';

// --- RENDER FUNCTION ---
const renderUserDetails = (user, wallet, activity) => {
    breadcrumbs.innerHTML = `<a href="/admin/users.html">Users</a> / ${user.fullName}`;
    
    // --- Helper functions for cleaner rendering ---
    const formatDate = (timestamp) => timestamp ? new Date(timestamp.seconds * 1000).toLocaleString() : 'N/A';
    const formatAddress = (address) => address || 'Not provided';
    
    // ✅ FIX: Updated to handle 'not_provided', 'pending_review', and 'verified'
    const getKycBadge = (status) => {
        const statusText = (status || 'not_provided').replace('_', ' ');
        let badgeClass = 'free'; // Default neutral style
        if (status === 'verified') badgeClass = 'verified';
        if (status === 'pending_review') badgeClass = 'pending';
        return `<span class="status-badge ${badgeClass}">${statusText}</span>`;
    };
    
    // ✅ FIX: Updated to read from 'accountType' field instead of 'plan'
    const getPlanBadge = (accountType) => {
        const plan = accountType || 'free'; // Default to free if missing
        const badgeClass = plan === 'premium' ? 'premium' : 'free';
        return `<span class="status-badge ${badgeClass}">${plan}</span>`;
    };

    const kpiCards = user.role === 'worker' ? `
        <div class="details-kpi"><h4>Balance</h4><p>${CURRENCY_SYMBOL}${wallet.balance.toFixed(2)}</p></div>
        <div class="details-kpi"><h4>Jobs Completed</h4><p>${user.jobsCompleted || 0}</p></div>
        <div class="details-kpi"><h4>Total Earned</h4><p>${CURRENCY_SYMBOL}${wallet.totalEarned.toFixed(2)}</p></div>
    ` : `
        <div class="details-kpi"><h4>Balance</h4><p>${CURRENCY_SYMBOL}${wallet.balance.toFixed(2)}</p></div>
        <div class="details-kpi"><h4>Jobs Posted</h4><p>${user.jobsPosted || 0}</p></div>
        <div class="details-kpi"><h4>Total Spent</h4><p>${CURRENCY_SYMBOL}${wallet.totalSpent.toFixed(2)}</p></div>
    `;

    // ✅ FIX: Updated to render the text from the new 'activities' collection
    const activityList = activity.length > 0
        ? activity.map(item => `<li><span>${item.text}</span><span class="date">${formatDate(item.timestamp)}</span></li>`).join('')
        : '<li>No recent activity found.</li>';

    // --- Final HTML Structure ---
    const html = `
        <div class="details-header">
            <div class="details-header-info">
                <h2>${user.fullName}</h2>
                <p>${user.email}</p>
            </div>
        </div>

        <div class="details-kpi-grid">${kpiCards}</div>
        
        <div class="details-main-grid">
            <div class="details-section">
                <h4>Account Information</h4>
                <div class="info-row"><span>User ID (UID)</span> <strong>${user.uid}</strong></div>
                <div class="info-row"><span>Username</span> <strong>${user.username || 'Not set'}</strong></div>
                <div class="info-row"><span>Role</span> <strong>${user.role}</strong></div>
                <div class="info-row"><span>Account Status</span> <strong>${user.status}</strong></div>
                <div class="info-row"><span>Subscription Plan</span> <strong>${getPlanBadge(user.accountType)}</strong></div>
                <div class="info-row"><span>KYC Status</span> <strong>${getKycBadge(user.kycStatus)}</strong></div>
                <div class="info-row"><span>Joined On</span> <strong>${formatDate(user.createdAt)}</strong></div>
                <div class="info-row"><span>Address</span> <strong>${formatAddress(user.address)}</strong></div>
                <div class="info-row"><span>Phone</span> <strong>${user.phone || 'Not provided'}</strong></div>
            </div>
            <div class="details-section">
                <h4>Recent Activity</h4>
                <ul class="recent-activity-list">${activityList}</ul>
            </div>
        </div>
    `;
    detailsCard.innerHTML = html;
};

// --- DATA FETCHING ---
(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    if (!userId) {
        detailsCard.innerHTML = '<h2>Error: No user ID provided.</h2>';
        return;
    }

    try {
        // Fetch user, wallet, and new activity data in parallel
        const userDocRef = doc(db, "users", userId);
        const walletDocRef = doc(db, "wallets", userId);
        
        // ✅ FIX: Query the new unified 'activities' collection instead of jobs/submissions
        const activityQuery = query(
            collection(db, "activities"), 
            where("userId", "==", userId), 
            orderBy("timestamp", "desc"), 
            limit(5)
        );

        const [userDoc, walletDoc, activitySnapshot] = await Promise.all([
            getDoc(userDocRef), 
            getDoc(walletDocRef),
            getDocs(activityQuery)
        ]);

        if (!userDoc.exists()) {
             detailsCard.innerHTML = `<h2>Error: User not found for ID: ${userId}</h2>`;
             return;
        }
        
        const userData = userDoc.data();
        const walletData = walletDoc.exists() ? walletDoc.data() : { balance: 0, totalEarned: 0, totalSpent: 0 };
        
        // ✨ NEW: Map the activity data from the new collection
        const activityData = activitySnapshot.docs.map(doc => doc.data());
        
        renderUserDetails(userData, walletData, activityData);

    } catch (error) {
        console.error("Error fetching user details:", error);
        detailsCard.innerHTML = `<h2>Error loading data. Check console for details.</h2><p>${error.message}</p>`;
    }
})();