// FILE: /client/js/client-dashboard.js (FINAL - WITH CORRECTED QUERY)

import { auth, db } from '/js/firebase-config.js';
import { doc, getDoc, collection, query, where, getCountFromServer, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {

    const statFunds = document.getElementById('stat-funds');
    const statPending = document.getElementById('stat-pending');
    const statActiveJobs = document.getElementById('stat-active-jobs');
    const statTotalSpent = document.getElementById('stat-total-spent');
    const jobListContainer = document.getElementById('job-list');
    const activityListContainer = document.getElementById('activity-list');
    const jobListHeader = document.querySelector('#job-list').previousElementSibling.querySelector('h3');
    const CURRENCY = '৳';

    // --- RENDER FUNCTIONS ---
    const updateStats = (wallet, stats) => {
        const walletBalance = wallet?.balance ?? 0;
        const totalSpent = wallet?.totalSpent ?? 0;
        const pendingSubmissions = stats?.pendingSubmissions ?? 0;
        const activeJobs = stats?.activeJobs ?? 0;

        statFunds.textContent = `${CURRENCY}${walletBalance.toLocaleString()}`;
        statPending.textContent = pendingSubmissions;
        statActiveJobs.textContent = activeJobs;
        statTotalSpent.textContent = `${CURRENCY}${totalSpent.toLocaleString()}`;
    };

    // এই নতুন ফাংশনটি দিয়ে আপনার পুরনো renderJobs ফাংশনটি প্রতিস্থাপন করুন

const renderJobs = (jobs) => {
    if (!jobListContainer) return;
    
    if (jobListHeader) {
        jobListHeader.textContent = 'My Jobs';
    }

    if (jobs.length === 0) {
        jobListContainer.innerHTML = '<p class="empty-list-message">You have not posted any jobs yet.</p>';
        return;
    }
    jobListContainer.innerHTML = jobs.map(job => {
        const completed = job.submissionsApproved || 0;
        const total = job.workersNeeded || 1;
        const progress = total > 0 ? (completed / total) * 100 : 0;
        
        // ✅ পরিবর্তন: ওয়ার্কার ড্যাশবোর্ডের মতো নতুন লেআউট
        return `
            <a href="/client/job-details.html?id=${job.id}" class="list-item-link">
                <div class="list-item-card">
                    <div class="card-top-section">
                        <h5 class="job-title">${job.title}</h5>
                        <div class="budget-amount"><strong>${CURRENCY}${(job.budgetTotal || 0).toLocaleString()}</strong></div>
                    </div>

                    <div class="progress-bar">
                        <div class="progress-bar__fill" style="width: ${progress}%;"></div>
                    </div>

                    <div class="card-bottom-section">
                        <span><i class="fa-solid fa-users"></i> ${completed}/${total} Submissions</span>
                        <span><i class="fa-solid fa-tag"></i> ${job.category}</span>
                    </div>
                </div>
            </a>
        `;
    }).join('');
};


// Helper function to format time
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
    
    // এই নতুন ফাংশনটি দিয়ে আপনার পুরনো renderActivity ফাংশনটি প্রতিস্থাপন করুন
const renderActivity = (activities) => {
    if (!activityListContainer) return;
    if (activities.length === 0) {
        activityListContainer.innerHTML = '<p class="empty-list-message">No recent activity.</p>';
        return;
    }

    const iconMap = {
        'DEPOSIT_SUCCESS': 'fa-plus',
        'deposit_requested': 'fa-plus',
        'JOB_POSTED': 'fa-briefcase',
        'SUBMISSION_APPROVED': 'fa-check',
        'SUBMISSION_REJECTED': 'fa-times',
        'TICKET_CREATED': 'fa-ticket',
        'TICKET_REPLY_ADMIN': 'fa-headset',
        'SUBMISSION_NEW': 'fa-inbox',
        'default': 'fa-bell'
    };

    activityListContainer.innerHTML = activities.map(activity => {
        const iconClass = iconMap[activity.type] || iconMap['default'];
        // ✅ পরিবর্তন: টাইমস্ট্যাম্প ফরম্যাট করা হচ্ছে
        const timestamp = timeAgo(activity.timestamp?.toDate());

        // ✅ পরিবর্তন: নতুন টাইমস্ট্যাম্প এলিমেন্ট যোগ করা হয়েছে
        return `
            <div class="list-item-card activity-item">
                <div class="activity-item__icon">
                    <i class="fa-solid ${iconClass}"></i>
                </div>
                <p class="activity-item__text">${activity.text || activity.message}</p>
                <span class="activity-item__timestamp">${timestamp}</span>
            </div>
        `;
    }).join('');
};

    // --- DATA FETCHING FUNCTIONS ---
    const fetchDashboardData = async (userId) => {
        try {
            // Fetch stats
            const walletDocRef = doc(db, "wallets", userId);
            const walletDoc = await getDoc(walletDocRef);
            const walletData = walletDoc.exists() ? walletDoc.data() : { balance: 0, totalSpent: 0 };

            // ✅ FIX: The query for pending submissions was incorrect.
            // This now correctly queries the top-level 'submissions' collection for all of the user's jobs.
            const submissionsRef = collection(db, "submissions");
            const pendingQuery = query(submissionsRef, where("clientId", "==", userId), where("status", "==", "pending"));

            const jobsRef = collection(db, "jobs");
            const activeJobsQuery = query(jobsRef, where("clientId", "==", userId), where("status", "in", ["open", "active"]));
            
            const [pendingSnapshot, activeJobsSnapshot] = await Promise.all([
                getCountFromServer(pendingQuery),
                getCountFromServer(activeJobsQuery)
            ]);
            
            const liveStats = {
                pendingSubmissions: pendingSnapshot.data().count,
                activeJobs: activeJobsSnapshot.data().count
            };

            updateStats(walletData, liveStats);

            // Fetch real jobs
            const jobsQuery = query(jobsRef, where("clientId", "==", userId), orderBy("createdAt", "desc"), limit(3));
            const jobsSnapshot = await getDocs(jobsQuery);
            const realJobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderJobs(realJobs);
            
            // Fetch real activities
            const activitiesRef = collection(db, "activities");
            const activitiesQuery = query(activitiesRef, where("userId", "==", userId), orderBy("timestamp", "desc"), limit(3));
            const activitiesSnapshot = await getDocs(activitiesQuery);
            const realActivities = activitiesSnapshot.docs.map(doc => doc.data());
            renderActivity(realActivities);

        } catch (error) {
            console.error("Error loading dashboard data:", error);
            updateStats({ balance: 0, totalSpent: 0 }, { pendingSubmissions: 0, activeJobs: 0 });
            renderJobs([]);
            renderActivity([]);
        }
    };

    // --- Main Logic ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            fetchDashboardData(user.uid);
        } else {
            window.location.href = '/login.html';
        }
    });
});