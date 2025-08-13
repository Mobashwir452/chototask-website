// FILE: /js/client-dashboard.js (WITH FAKE DATA)

import { auth, db } from '/js/firebase-config.js';
import { doc, getDoc, collection, query, where, getCountFromServer, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {

    const statFunds = document.getElementById('stat-funds');
    const statPending = document.getElementById('stat-pending');
    const statActiveJobs = document.getElementById('stat-active-jobs');
    const statTotalSpent = document.getElementById('stat-total-spent');
    const jobList = document.getElementById('job-list');
    const activityList = document.getElementById('activity-list');
    const headerBalance = document.getElementById('header-balance');
    const CURRENCY = '৳';

const updateStats = (wallet, stats) => {
    const walletBalance = wallet?.balance ?? 0;
    const totalSpent = wallet?.totalSpent ?? 0;
    const pendingSubmissions = stats?.pendingSubmissions ?? 0;
    const activeJobs = stats?.activeJobs ?? 0;

    statFunds.textContent = `${CURRENCY}${walletBalance.toLocaleString()}`;
    // The line below should be DELETED
    // if (headerBalance) { headerBalance.textContent = ... }
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
    
    // --- New function to render fake activity ---
const renderActivity = (activities) => {
    if (!activityList) return;
    if (activities.length === 0) {
        activityList.innerHTML = '<p class="empty-list-message">No recent activity.</p>';
        return;
    }
    // FIX: Simplified the rendering logic as the icon color is now always the same
    activityList.innerHTML = activities.map(activity => {
        return `
            <div class="list-item-card activity-item">
                <div class="activity-item__icon">
                    <i class="fa-solid ${activity.icon}"></i>
                </div>
                <p class="activity-item__text">${activity.text}</p>
            </div>
        `;
    }).join('');
};

    // --- Main Logic ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // We will still fetch the main stats from Firestore
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

                updateStats(walletData, liveStats);

            } catch (error) {
                console.error("Error loading stats:", error);
                updateStats({ balance: 0, totalSpent: 0 }, { pendingSubmissions: 0, activeJobs: 0 });
            }
            
            // --- FAKE DATA FOR LISTS ---
            const dummyJobs = [
                { title: "Data Entry for Online Store", submissionsCompleted: 150, workersNeeded: 200 },
                { title: "Social Media Engagement Boost", submissionsCompleted: 45, workersNeeded: 50 },
                { title: "Translate English to Bengali", submissionsCompleted: 88, workersNeeded: 100 }
            ];
            
   const dummyActivities = [
            { text: "You successfully added <strong>৳1000</strong> to your wallet.", icon: "fa-plus" },
            { text: "Your job 'Social Media Engagement Boost' is now complete.", icon: "fa-flag-checkered" },
            { text: "You approved a submission for 'Data Entry for Online Store'.", icon: "fa-check" }
        ];

            // Render the fake data
            renderJobs(dummyJobs);
            renderActivity(dummyActivities);

        } else {
            window.location.href = '/login.html';
        }
    });
});