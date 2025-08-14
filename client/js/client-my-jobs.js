// FILE: /client/js/client-my-jobs.js

import { auth, db } from '/js/firebase-config.js';
import { collection, query, where, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {

    const jobFiltersContainer = document.getElementById('job-filters');
    const myJobsList = document.getElementById('my-jobs-list');
    let currentUserId = null;
    let unsubscribe; // To store the Firestore listener function

    // --- UPDATED RENDER FUNCTION ---
    const renderJobs = (jobs) => {
        if (!myJobsList) return;

        if (jobs.length === 0) {
            myJobsList.innerHTML = '<p class="empty-list-message">No jobs found for this category.</p>';
            return;
        }

        myJobsList.innerHTML = jobs.map(job => {
            const postedDate = job.createdAt ? job.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
            const statusText = job.status.replace('_', ' ');
            
            // Calculate progress for the progress bar
            const approved = job.submissionsApproved || 0;
            const needed = job.workersNeeded || 1; // Avoid division by zero
            const progress = needed > 0 ? (approved / needed) * 100 : 0;

            return `
                <div class="job-card">
                    <div class="job-card__header">
                        <h4 class="job-card__title">${job.title}</h4>
                        <span class="status-badge ${job.status}">${statusText}</span>
                    </div>

                    <div class="job-card__stats-grid">
                        <div class="stat-item">
                            <div class="stat-item__icon"><i class="fa-solid fa-coins"></i></div>
                            <div class="stat-item__text">Budget <strong>৳${job.totalCost.toLocaleString()}</strong></div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-item__icon"><i class="fa-solid fa-users"></i></div>
                            <div class="stat-item__text">Workers <strong>${job.workersNeeded}</strong></div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-item__icon"><i class="fa-solid fa-check-to-slot"></i></div>
                            <div class="stat-item__text">Submissions <strong>${approved}</strong></div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-item__icon"><i class="fa-solid fa-calendar-day"></i></div>
                            <div class="stat-item__text">Posted On <strong>${postedDate}</strong></div>
                        </div>
                    </div>

                    <div class="progress-container">
                        <div class="progress-labels">
                            <span>Progress</span>
                            <strong>${approved} / ${needed}</strong>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-bar__fill" style="width: ${progress.toFixed(2)}%;"></div>
                        </div>
                    </div>

                    <div class="job-card__footer">
                        <a href="/client/job-details.html?id=${job.id}" class="btn-manage">View & Manage</a>
                    </div>
                </div>
            `;
        }).join('');
    };

    const fetchAndRenderJobs = (status = 'all') => {
        if (!currentUserId) return;
        if (unsubscribe) unsubscribe(); // Detach the old listener

        const jobsRef = collection(db, 'jobs');
        let q;

        if (status === 'all') {
            q = query(jobsRef, where("clientId", "==", currentUserId), orderBy("createdAt", "desc"));
        } else {
            q = query(jobsRef, where("clientId", "==", currentUserId), where("status", "==", status), orderBy("createdAt", "desc"));
        }

        unsubscribe = onSnapshot(q, (querySnapshot) => {
            const jobs = [];
            querySnapshot.forEach((doc) => {
                // Add submissionsApproved field if it doesn't exist for older jobs
                const jobData = doc.data();
                if (jobData.submissionsApproved === undefined) {
                    jobData.submissionsApproved = 0;
                }
                jobs.push({ id: doc.id, ...jobData });
            });
            renderJobs(jobs);
        }, (error) => {
            console.error("Error fetching jobs: ", error);
            myJobsList.innerHTML = '<p class="empty-list-message">Could not load jobs. Please try again later.</p>';
        });
    };

    // --- Event Listeners ---
    if (jobFiltersContainer) {
        jobFiltersContainer.addEventListener('click', (e) => {
            if (e.target.matches('.filter-btn')) {
                jobFiltersContainer.querySelector('.active').classList.remove('active');
                e.target.classList.add('active');
                fetchAndRenderJobs(e.target.dataset.status);
            }
        });
    }

    // --- Initialization ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            fetchAndRenderJobs(); // Fetch all jobs initially
        } else {
            window.location.href = '/login.html';
        }
    });

});