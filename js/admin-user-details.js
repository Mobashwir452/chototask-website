// FILE: /js/admin-user-details.js (REVISED)
import { db } from '/js/firebase-config.js';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const detailsCard = document.getElementById('details-card');
const breadcrumbs = document.querySelector('.a-breadcrumbs');

// --- RENDER FUNCTION ---
const renderUserDetails = (user, wallet, activity) => {
    // Update breadcrumbs for context
    breadcrumbs.innerHTML = `<a href="/admin/users.html">Users</a> / ${user.fullName}`;

    const joinedDate = user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleString() : 'N/A';
    
    // Determine which stats to show based on role
    const kpiCards = user.role === 'worker' ? `
        <div class="details-kpi"><h4>Balance</h4><p>$${wallet.balance.toFixed(2)}</p></div>
        <div class="details-kpi"><h4>Jobs Completed</h4><p>${user.jobsCompleted || 0}</p></div>
        <div class="details-kpi"><h4>Total Earned</h4><p>$${wallet.totalEarned.toFixed(2)}</p></div>
    ` : `
        <div class="details-kpi"><h4>Balance</h4><p>$${wallet.balance.toFixed(2)}</p></div>
        <div class="details-kpi"><h4>Jobs Posted</h4><p>${user.jobsPosted || 0}</p></div>
        <div class="details-kpi"><h4>Total Spent</h4><p>$${wallet.totalSpent.toFixed(2)}</p></div>
    `;

    // Generate recent activity list
    const activityList = activity.length > 0
        ? activity.map(item => `<li>${item.description} - <strong>${new Date(item.date.seconds * 1000).toLocaleDateString()}</strong></li>`).join('')
        : '<li>No recent activity found.</li>';

    const html = `
        <div class="details-header">
            <div class="details-header-info">
                <h2>${user.fullName}</h2>
                <p>${user.email}</p>
            </div>
            <div class="a-actions">
                </div>
        </div>

        <div class="details-kpi-grid">${kpiCards}</div>
        
        <div class="details-section-grid">
            <div class="details-section">
                <h4>Account Information</h4>
                <p><span>User ID (UID)</span> <strong>${user.uid}</strong></p>
                <p><span>Role</span> <strong>${user.role}</strong></p>
                <p><span>Status</span> <strong>${user.status}</strong></p>
                <p><span>Joined On</span> <strong>${joinedDate}</strong></p>
            </div>
            <div class="details-section">
                <h4>Recent Activity</h4>
                <ul>${activityList}</ul>
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