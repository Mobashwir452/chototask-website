// FILE: /js/client-dashboard.js (CORRECTED)

import { auth, db } from '/js/firebase-config.js';
import { doc, getDoc, collection, query, where, getCountFromServer, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// FIX: We will wrap the entire script in an event listener to wait for components to load.
document.addEventListener('componentsLoaded', () => {

    // --- DOM Elements ---
    // Now these elements will be found correctly after the header is loaded.
    const statFunds = document.getElementById('stat-funds');
    const statPending = document.getElementById('stat-pending');
    const statActiveJobs = document.getElementById('stat-active-jobs');
    const statTotalSpent = document.getElementById('stat-total-spent');
    const jobList = document.getElementById('job-list');
    const activityList = document.getElementById('activity-list');
    const headerBalance = document.getElementById('header-balance');

    const CURRENCY = '৳';

    // --- Functions to update UI ---
    const updateStats = (wallet, stats) => {
        const walletBalance = wallet?.balance ?? 0;
        const totalSpent = wallet?.totalSpent ?? 0;
        const pendingSubmissions = stats?.pendingSubmissions ?? 0;
        const activeJobs = stats?.activeJobs ?? 0;

        statFunds.textContent = `${CURRENCY}${walletBalance.toLocaleString()}`;
        if (headerBalance) {
            headerBalance.textContent = `${CURRENCY}${walletBalance.toLocaleString()}`;
        }
        statPending.textContent = pendingSubmissions;
        statActiveJobs.textContent = activeJobs;
        statTotalSpent.textContent = `${CURRENCY}${totalSpent.toLocaleString()}`;
    };

    const renderJobs = (jobs) => {
        if (!jobList) return;
        if (jobs.length === 0) {
            jobList.innerHTML = '<p class="empty-list-message">You have no active jobs.</p>';
            return;
        }
        jobList.innerHTML = jobs.map(job => {
            const completed = job.submissionsCompleted || 0;
            const total = job.workersNeeded || 0;
            const progress = total > 0 ? (completed / total) * 100 : 0;
            return `
                <div class="list-item-card">
                    <h5>${job.title}</h5>
                    <div class="job-progress">
                        <span>${completed}/${total} Submissions</span>
                        <span>${progress.toFixed(0)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-bar__fill" style="width: ${progress}%;"></div>
                    </div>
                </div>
            `;
        }).join('');
    };

    // --- Main Logic ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const walletDocRef = doc(db, "wallets", user.uid);
                const walletDoc = await getDoc(walletDocRef);
                const walletData = walletDoc.exists() ? walletDoc.data() : { balance: 0, totalSpent: 0 };

                const submissionsRef = collection(db, "submissions");
                const jobsRef = collection(db, "jobs");
                const pendingQuery = query(submissionsRef, where("clientId", "==", user.uid), where("status", "==", "pending"));
                const activeJobsQuery = query(jobsRef, where("clientId", "==", user.uid), where("status", "==", "active"));
                
                const [pendingSnapshot, activeJobsSnapshot] = await Promise.all([
                    getCountFromServer(pendingQuery),
                    getCountFromServer(activeJobsQuery)
                ]);
                
                const liveStats = {
                    pendingSubmissions: pendingSnapshot.data().count,
                    activeJobs: activeJobsSnapshot.data().count
                };
                
                const recentJobsQuery = query(jobsRef, where("clientId", "==", user.uid), where("status", "==", "active"), orderBy("createdAt", "desc"), limit(3));
                const jobsSnapshot = await getDocs(recentJobsQuery);
                const recentJobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                updateStats(walletData, liveStats);
                renderJobs(recentJobs);
                
                if(activityList) {
                    activityList.innerHTML = '<p class="empty-list-message">Recent activity feed is under construction.</p>';
                }

            } catch (error) {
                console.error("Error loading dashboard:", error);
                updateStats({ balance: 0, totalSpent: 0 }, { pendingSubmissions: 0, activeJobs: 0 });
            }
        } else {
            window.location.href = '/login.html';
        }
    });

}); // End of the new 'componentsLoaded' event listener