// FILE: /js/client-dashboard.js
import { auth, db } from '/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const updateStats = (wallet, stats) => {
    statFunds.textContent = `${CURRENCY}${wallet.balance.toFixed(2)}`;
    headerBalance.textContent = `${CURRENCY}${wallet.balance.toFixed(2)}`; // Also update header
    statPending.textContent = stats.pendingSubmissions || 0;
    statActiveJobs.textContent = stats.activeJobs || 0;
    statTotalSpent.textContent = `${CURRENCY}${wallet.totalSpent.toFixed(2)}`;
};

const renderJobs = (jobs) => {
    if (jobs.length === 0) {
        jobList.innerHTML = '<p>You have no active jobs.</p>';
        return;
    }
    jobList.innerHTML = jobs.map(job => {
        const progress = (job.completed / job.total) * 100;
        return `
            <div class="job-item">
                <h5>${job.title}</h5>
                <div class="job-progress">
                    <span>${job.completed}/${job.total} Submissions</span>
                    <span>${progress.toFixed(0)}%</span>
                </div>
                <div class="progress-bar">
                    <div style="width: ${progress}%;"></div>
                </div>
            </div>
        `;
    }).join('');
};

// --- Main Logic ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in, fetch their data
        const walletDocRef = doc(db, "wallets", user.uid);
        const walletDoc = await getDoc(walletDocRef);
        
        if (walletDoc.exists()) {
            // Dummy data for now - replace with real queries later
            const dummyStats = { pendingSubmissions: 15, activeJobs: 4 };
            const dummyJobs = [
                { title: 'Social Media Engagement', completed: 150, total: 200 },
                { title: 'Data Entry Task', completed: 50, total: 500 },
                { title: 'Image Tagging Project', completed: 800, total: 1000 },
            ];

            updateStats(walletDoc.data(), dummyStats);
            renderJobs(dummyJobs);
            // You would also fetch and render recent activity here
            activityList.innerHTML = '<p>Activity feed is under construction.</p>';
        } else {
            console.error("Wallet document not found for user:", user.uid);
        }
    } else {
        // User is signed out, redirect to login
        window.location.href = '/login.html';
    }
});
