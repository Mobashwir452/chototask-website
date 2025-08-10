// FILE: /js/client-dashboard.js (REVISED WITH LIVE DATA)

import { auth, db } from '/js/firebase-config.js';
import { doc, getDoc, collection, query, where, getCountFromServer, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// --- DOM Elements ---
const statFunds = document.getElementById('stat-funds');
const statPending = document.getElementById('stat-pending');
const statActiveJobs = document.getElementById('stat-active-jobs');
const statTotalSpent = document.getElementById('stat-total-spent');
const jobList = document.getElementById('job-list');
const activityList = document.getElementById('activity-list');
const headerBalance = document.getElementById('header-balance'); 

const CURRENCY = '৳';

// --- Functions to update UI ---
// --- Functions to update UI ---
const updateStats = (wallet, stats) => {
    // THIS IS THE FALLBACK LOGIC: If wallet.balance is missing, it will use 0.
    const walletBalance = wallet?.balance ?? 0;
    const totalSpent = wallet?.totalSpent ?? 0;
    const pendingSubmissions = stats?.pendingSubmissions ?? 0;
    const activeJobs = stats?.activeJobs ?? 0;

    statFunds.textContent = `${CURRENCY}${walletBalance.toLocaleString()}`;
    if (headerBalance) {
        // Assuming header-balance is just the amount
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
// --- Main Logic ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            // 1. Fetch Wallet Document
            const walletDocRef = doc(db, "wallets", user.uid);
            const walletDoc = await getDoc(walletDocRef);
            
            // THIS IS THE FALLBACK LOGIC: If wallet document doesn't exist, create a default object.
            const walletData = walletDoc.exists() ? walletDoc.data() : { balance: 0, totalSpent: 0 };

            // 2. Fetch STATS (Pending Submissions & Active Jobs)
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
            // 3. Fetch recent jobs for the list
            const recentJobsQuery = query(jobsRef, where("clientId", "==", user.uid), where("status", "==", "active"), orderBy("createdAt", "desc"), limit(3));
            const jobsSnapshot = await getDocs(recentJobsQuery);
            const recentJobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 4. Update the entire UI at once
            updateStats(walletData, liveStats);
            renderJobs(recentJobs);
            
            // Placeholder for recent activity
            if(activityList) {
                activityList.innerHTML = '<p class="empty-list-message">Recent activity feed is under construction.</p>';
            }

        } catch (error) {
            console.error("Error loading dashboard:", error);
            // Handle errors, maybe show a message to the user
        }
    } else {
        // User is signed out, redirect to login
        console.log("User is not signed in. Redirecting to login.");
        window.location.href = '/login.html';
    }
});