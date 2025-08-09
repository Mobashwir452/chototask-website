// FILE: /js/admin-user-details.js (FINAL VERSION)
import { db } from '/js/firebase-config.js';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const detailsCard = document.getElementById('details-card');
const breadcrumbs = document.querySelector('.a-breadcrumbs');
const CURRENCY_SYMBOL = '৳'; // <-- CHANGE CURRENCY HERE

// --- RENDER FUNCTION ---
const renderUserDetails = (user, wallet, activity) => {
    breadcrumbs.innerHTML = `<a href="/admin/users.html">Users</a> / ${user.fullName}`;
    
    // --- Helper functions for cleaner rendering ---
    const formatDate = (timestamp) => timestamp ? new Date(timestamp.seconds * 1000).toLocaleString() : 'N/A';
    const formatAddress = (address) => address ? `${address.street}, ${address.city}, ${address.country}` : 'Not provided';
    
    const getKycBadge = (status) => {
        const statusMap = { 'Verified': 'verified', 'Pending': 'pending', 'Not Submitted': 'free' };
        const badgeClass = statusMap[status] || 'free';
        return `<span class="status-badge ${badgeClass}">${status || 'N/A'}</span>`;
    };
    
    const getPlanBadge = (plan) => {
        const badgeClass = plan === 'Premium' ? 'premium' : 'free';
        return `<span class="status-badge ${badgeClass}">${plan || 'N/A'}</span>`;
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

    const activityList = activity.length > 0
        ? activity.map(item => `<li><span>${item.description}</span><span class="date">${new Date(item.date.seconds * 1000).toLocaleDateString()}</span></li>`).join('')
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
                <div class="info-row"><span>Subscription Plan</span> <strong>${getPlanBadge(user.plan)}</strong></div>
                <div class="info-row"><span>KYC Status</span> <strong>${getKycBadge(user.kycStatus)}</strong></div>
                <div class="info-row"><span>Joined On</span> <strong>${formatDate(user.createdAt)}</strong></div>
                <div class="info-row"><span>Address</span> <strong>${formatAddress(user.address)}</strong></div>
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
        // Fetch user and wallet data in parallel
        const userDocRef = doc(db, "users", userId);
        const walletDocRef = doc(db, "wallets", userId);
        const [userDoc, walletDoc] = await Promise.all([getDoc(userDocRef), getDoc(walletDocRef)]);

        // Check for user existence (this is required)
        if (!userDoc.exists()) {
             detailsCard.innerHTML = `<h2>Error: User not found for ID: ${userId}</h2>`;
             return;
        }
        
        const userData = userDoc.data();
        // Handle cases where wallet might not exist for old users
        const walletData = walletDoc.exists() ? walletDoc.data() : { balance: 0, totalEarned: 0, totalSpent: 0, currency: 'USD' };

        // Fetch recent activity based on role
        let activity = [];
        if (userData.role === 'worker') {
            const submissionsQuery = query(collection(db, "submissions"), where("workerId", "==", userId), orderBy("submittedAt", "desc"), limit(5));
            const submissionDocs = await getDocs(submissionsQuery);
            activity = submissionDocs.docs.map(d => ({ description: `Submitted job: ${d.data().jobTitle || 'Untitled'}`, date: d.data().submittedAt }));
        } else if (userData.role === 'client') {
            const jobsQuery = query(collection(db, "jobs"), where("clientId", "==", userId), orderBy("createdAt", "desc"), limit(5));
            const jobDocs = await getDocs(jobsQuery);
            activity = jobDocs.docs.map(d => ({ description: `Posted job: ${d.data().title}`, date: d.data().createdAt }));
        }
        
        renderUserDetails(userData, walletData, activity);

    } catch (error) {
        console.error("Error fetching user details:", error);
        detailsCard.innerHTML = `<h2>Error loading data. Check console for details.</h2><p>${error.message}</p>`;
    }
})();