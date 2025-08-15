// FILE: /worker/js/worker-dashboard.js

import { auth, db } from '/js/firebase-config.js';
import { doc, getDoc, collection, query, where, getCountFromServer, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {
    // DOM Elements for KPIs
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

    const renderJobs = (jobs) => {
        if (!jobListContainer) return;
        if (jobs.length === 0) {
            jobListContainer.innerHTML = '<p class="empty-list-message">No available jobs right now. Check back soon!</p>';
            return;
        }
        jobListContainer.innerHTML = jobs.map(job => `
            <a href="/worker/job-details.html?id=${job.id}" class="list-item-link">
                <div class="list-item-card">
                    <h5>${job.title}</h5>
                    <div class="job-progress">
                        <span>Payout: <strong>${CURRENCY}${job.costPerWorker}</strong></span>
                        <span>${job.category}</span>
                    </div>
                </div>
            </a>
        `).join('');
    };
    
    const renderActivity = (activities) => {
        // This function can be copied from client-dashboard.js and adapted as needed
        activityListContainer.innerHTML = '<p class="empty-list-message">No recent activity.</p>';
    };

    // DATA FETCHING
    const fetchDashboardData = async (userId) => {
        try {
            // Fetch wallet
            const walletDoc = await getDoc(doc(db, "wallets", userId));
            const walletData = walletDoc.exists() ? walletDoc.data() : { balance: 0, totalEarned: 0 };

            // Fetch stats
            const submissionsRef = collection(db, "submissions");
            const pendingQuery = query(submissionsRef, where("workerId", "==", userId), where("status", "==", "pending"));
            const completedQuery = query(submissionsRef, where("workerId", "==", userId), where("status", "==", "approved"));
            const [pendingSnapshot, completedSnapshot] = await Promise.all([
                getCountFromServer(pendingQuery),
                getCountFromServer(completedQuery)
            ]);
            const liveStats = {
                pendingSubmissions: pendingSnapshot.data().count,
                completedJobs: completedSnapshot.data().count
            };
            updateStats(walletData, liveStats);

            // Fetch newest available jobs
            const jobsRef = collection(db, "jobs");
            const jobsQuery = query(jobsRef, where("status", "in", ["open", "active"]), orderBy("createdAt", "desc"), limit(3));
            const jobsSnapshot = await getDocs(jobsQuery);
            const realJobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderJobs(realJobs);
            
            // Fetch worker activities
            renderActivity([]); // Placeholder

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