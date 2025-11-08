// === FILE: /worker/js/worker-dashboard.js (UPDATED & FINAL) ===

import { auth, db } from '/js/firebase-config.js';
import { doc, getDoc, collection, query, where, getCountFromServer, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ✅ Helper function to format time (from worker-shell.js)
function timeAgo(date) {
    if (!date) return '';
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000; if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000; if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400; if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600; if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60; if (interval > 1) return Math.floor(interval) + "m ago";
    return "Just now";
}

document.addEventListener('componentsLoaded', () => {
    // DOM Elements
    const statFunds = document.getElementById('stat-funds');
    const statPending = document.getElementById('stat-pending');
    const statCompletedJobs = document.getElementById('stat-completed-jobs');
    const statTotalEarned = document.getElementById('stat-total-earned');
    const jobListContainer = document.getElementById('job-list');
    const activityListContainer = document.getElementById('activity-list');
    const CURRENCY = '৳';

    // RENDER FUNCTIONS
    const updateStats = (wallet, stats) => {
        statFunds.textContent = `${CURRENCY}${(wallet?.balance ?? 0).toLocaleString()}`;
        statPending.textContent = (stats?.pendingSubmissions ?? 0);
        statCompletedJobs.textContent = (stats?.completedJobs ?? 0);
        statTotalEarned.textContent = `${CURRENCY}${(wallet?.totalEarned ?? 0).toLocaleString()}`;
    };

// ===================================================================
// === START: renderJobs ফাংশনটি আপডেট করা হয়েছে ===
// ===================================================================
const renderJobs = (jobs) => {
    if (!jobListContainer) return;
    if (jobs.length === 0) {
        jobListContainer.innerHTML = '<p class="empty-list-message">No available jobs right now. Check back soon!</p>';
        return;
    }
    jobListContainer.innerHTML = jobs.map(job => {
        // --- CHANGED: স্লট কাউন্ট লজিক আপডেট করা হয়েছে ---
        const approved = job.submissionsApproved || 0;
        const pending = job.submissionsPending || 0; // নতুন: পেন্ডিং কাউন্ট যোগ করা হয়েছে
        const slotsTaken = approved + pending; // নতুন: এটিই স্লটের আসল সংখ্যা
        const needed = job.workersNeeded || 0;
        const progressPercent = needed > 0 ? (slotsTaken / needed) * 100 : 0; // প্রোগ্রেস বারও আপডেট করা হয়েছে

        return `
            <a href="/worker/job-details.html?id=${job.id}" class="list-item-link">
                <div class="list-item-card">
                    <div class="card-top-section">
                        <h5 class="job-title">${job.title}</h5>
                        <div class="payout-amount"><strong>${CURRENCY}${job.costPerWorker}</strong></div>
                    </div>
                    
                    <div class="progress-bar">
                        <div class="progress-bar__fill" style="width: ${progressPercent}%;"></div>
                    </div>
                    
                    <div class="card-bottom-section">
                        <span><i class="fa-solid fa-users"></i> ${slotsTaken}/${needed} Filled</span>
                        <span><i class="fa-solid fa-tag"></i> ${job.category}</span>
                    </div>
                </div>
            </a>
        `;
    }).join('');
};
// ===================================================================
// === END: renderJobs ফাংশন আপডেট ===
// ===================================================================
    
const renderActivity = (activities) => {
    if (!activityListContainer) return;
    if (activities.length === 0) {
        activityListContainer.innerHTML = '<p class="empty-list-message">No recent activity.</p>';
        return;
    }

    const iconMap = {
        'withdrawal_approved': 'fa-check',
        'withdrawal_rejected': 'fa-times',
        'submission_approved': 'fa-sack-dollar',
        'submission_rejected': 'fa-exclamation-triangle',
        'default': 'fa-bell'
    };

    activityListContainer.innerHTML = activities.map(activity => {
        const iconClass = iconMap[activity.type] || iconMap['default'];
        const timestamp = timeAgo(activity.timestamp?.toDate());
        const tag = activity.refLink ? 'a' : 'div';
        const href = activity.refLink ? `href="${activity.refLink}"` : '';

        return `
            <${tag} ${href} class="list-item-card activity-item">
                <div class="activity-item__icon">
                    <i class="fa-solid ${iconClass}"></i>
                </div>
                <p class="activity-item__text">${activity.text}</p>
                <span class="activity-item__timestamp">${timestamp}</span>
            </${tag}>
        `;
    }).join('');
};

    // DATA FETCHING
    const fetchDashboardData = async (userId) => {
        try {
            const walletDocRef = doc(db, "wallets", userId);
            const submissionsRef = collection(db, "submissions");
            const jobsRef = collection(db, "jobs");
            const activitiesRef = collection(db, "activities");

            // Queries
            const walletPromise = getDoc(walletDocRef);
            const pendingQuery = query(submissionsRef, where("workerId", "==", userId), where("status", "==", "pending"));
            const completedQuery = query(submissionsRef, where("workerId", "==", userId), where("status", "==", "approved"));
            const jobsQuery = query(jobsRef, where("status", "in", ["open", "active"]), orderBy("createdAt", "desc"), limit(3));
            const activityQuery = query(activitiesRef, where("userId", "==", userId), orderBy("timestamp", "desc"), limit(3));

            const [
                walletDoc,
                pendingSnapshot,
                completedSnapshot,
                jobsSnapshot,
                activitySnapshot 
            ] = await Promise.all([
                walletPromise,
                getCountFromServer(pendingQuery),
                getCountFromServer(completedQuery),
                getDocs(jobsQuery),
                getDocs(activityQuery) 
            ]);

            // Process Stats & Wallet
            const walletData = walletDoc.exists() ? walletDoc.data() : { balance: 0, totalEarned: 0 };
            const liveStats = {
                pendingSubmissions: pendingSnapshot.data().count,
                completedJobs: completedSnapshot.data().count
            };
            updateStats(walletData, liveStats);

            // Process Jobs
            const realJobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderJobs(realJobs);
            
            const activities = activitySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderActivity(activities);

        } catch (error) {
            console.error("Error loading worker dashboard data:", error);
        }
    };

    // INIT
    onAuthStateChanged(auth, (user) => {
        if (user) {
            fetchDashboardData(user.uid);
        }
    });
});