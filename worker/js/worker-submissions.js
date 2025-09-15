// === FILE: /worker/js/worker-submissions.js (CORRECTED & FINAL) ===

import { auth, db } from '/js/firebase-config.js';
import { collectionGroup, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {
    
    const heroContainer = document.getElementById('hero-container');
    const tabsContainer = document.getElementById('tabs-container');
    const submissionsList = document.getElementById('submissions-list');

    let allSubmissions = [];
    let activeTab = 'resubmit_required'; // Default to this tab to show the new item
    let countdownIntervals = []; 

    // --- RENDER FUNCTIONS ---
    const renderHero = () => {
        heroContainer.innerHTML = `
            <section class="page-hero">
                <div class="page-hero__icon"><div class="icon-layer icon-layer--bottom"></div><div class="icon-layer icon-layer--middle"></div><div class="icon-layer icon-layer--top" style="font-size: 1.5rem;"><i class="fa-solid fa-paper-plane"></i></div></div>
                <h1 class="page-hero__title">My Submissions</h1>
                <p class="page-hero__subtitle">Track the status of all your submitted tasks and manage resubmissions.</p>
            </section>`;
    };

    const renderTabs = () => {
        const counts = {
            pending: allSubmissions.filter(s => s.status === 'pending').length,
            // ✅ FIX: Count submissions with 'resubmit_pending' status
            resubmit_required: allSubmissions.filter(s => s.status === 'resubmit_pending').length,
            approved: allSubmissions.filter(s => s.status === 'approved').length,
            rejected: allSubmissions.filter(s => s.status === 'rejected').length,
        };
        tabsContainer.innerHTML = `
            <button class="tab-btn ${activeTab === 'pending' ? 'active' : ''}" data-tab="pending">Pending <span class="count-badge">${counts.pending}</span></button>
            <button class="tab-btn resubmit-required ${activeTab === 'resubmit_required' ? 'active' : ''}" data-tab="resubmit_required">Resubmit <span class="count-badge">${counts.resubmit_required}</span></button>
            <button class="tab-btn ${activeTab === 'approved' ? 'active' : ''}" data-tab="approved">Approved <span class="count-badge">${counts.approved}</span></button>
            <button class="tab-btn ${activeTab === 'rejected' ? 'active' : ''}" data-tab="rejected">Rejected <span class="count-badge">${counts.rejected}</span></button>
        `;
    };

    const renderList = () => {
        countdownIntervals.forEach(clearInterval);
        countdownIntervals = [];

        let filteredSubmissions = [];
        if (activeTab === 'pending') {
            filteredSubmissions = allSubmissions.filter(s => s.status === 'pending');
        } 
        // ✅ FIX: Filter by 'resubmit_pending' for the correct tab
        else if (activeTab === 'resubmit_required') {
            filteredSubmissions = allSubmissions.filter(s => s.status === 'resubmit_pending');
        } else if (activeTab === 'approved') {
            filteredSubmissions = allSubmissions.filter(s => s.status === 'approved');
        } else if (activeTab === 'rejected') {
             filteredSubmissions = allSubmissions.filter(s => s.status === 'rejected');
        }

        if (filteredSubmissions.length === 0) {
            submissionsList.innerHTML = `<p class="empty-list-message">No submissions in this category.</p>`;
            return;
        }

        submissionsList.innerHTML = filteredSubmissions.map(sub => {
            const submittedDate = sub.submittedAt ? sub.submittedAt.toDate().toLocaleDateString() : 'N/A';
            const statusClass = `status-badge--${sub.status.replace('_', '-')}`;
            
            let footerHTML = '';
            let timerHTML = '';

            if (sub.status === 'pending') {
                const timerId = `review-timer-${sub.id}`;
                timerHTML = `<div class="review-timer" id="${timerId}" data-submitted-at="${sub.submittedAt.toMillis()}">Awaiting review...</div>`;
            }

            // ✅ FIX: Logic for the resubmit_pending state
            if (sub.status === 'resubmit_pending') {
                const timerId = `timer-${sub.id}`;
                footerHTML = `
                    <div class="card-footer">
                        <div class="rejection-details">
                            <h4>Rejection Reason</h4>
                            <p>${sub.rejectionReason || 'No reason provided.'}</p>
                        </div>
                        <div class="resubmit-action">
                            <span class="resubmit-timer" id="${timerId}" data-rejection-timestamp="${sub.rejectionTimestamp.toMillis()}">Calculating time left...</span>
                            <a href="/worker/task-resubmission.html?jobId=${sub.jobId}&submissionId=${sub.id}" class="btn-resubmit">Resubmit Proof</a>
                        </div>
                    </div>`;
            } else if (sub.status === 'approved') {
                footerHTML = `
                    <div class="card-footer rating-action">
                        <a href="#" class="btn-rate-client">Rate The Client</a>
                    </div>`;
            }

            return `
                <a href="/worker/submission-details.html?jobId=${sub.jobId}&submissionId=${sub.id}" class="submission-card-link">
                    <div class="submission-card">
                        <div class="card-header">
                            <span class="task-title">${sub.jobTitle || 'Task Title Not Found'}</span>
                            <span class="status-badge ${statusClass}">${sub.status.replace('_', ' ')}</span>
                        </div>
                        <div class="card-body">
                            <div class="info-item">
                                <i class="fas fa-calendar-alt"></i> Submitted On: <strong>${submittedDate}</strong>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-sack-dollar"></i> Payout: <strong>৳${sub.payout || 0}</strong>
                            </div>
                        </div>
                        ${timerHTML}
                        ${footerHTML}
                    </div>
                </a>`;
        }).join('');
        
        startResubmitCountdownTimers();
        startReviewCountdownTimers();
    };

    const startReviewCountdownTimers = () => {
        const timers = document.querySelectorAll('.review-timer');
        const autoApproveDuration = 24 * 60 * 60 * 1000;

        timers.forEach(timerEl => {
            const submittedAt = parseInt(timerEl.dataset.submittedAt, 10);
            if (!submittedAt) return;
            
            const deadline = submittedAt + autoApproveDuration;
            
            const intervalId = setInterval(() => {
                const now = new Date();
                const diff = deadline - now;
                if (diff <= 0) {
                    clearInterval(intervalId);
                    timerEl.innerHTML = `<strong>Awaiting Auto-Approval...</strong>`;
                    return;
                }
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                timerEl.innerHTML = `Auto-approves in: <strong>${hours}h ${minutes}m</strong>`;
            }, 1000);
            countdownIntervals.push(intervalId);
        });
    };

    // ✅ FIX: Timer logic now uses rejectionTimestamp and calculates the 12-hour deadline
    const startResubmitCountdownTimers = () => {
        const timers = document.querySelectorAll('.resubmit-timer');
        const resubmitDuration = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

        timers.forEach(timerEl => {
            const rejectionTimestamp = parseInt(timerEl.dataset.rejectionTimestamp, 10);
            if (!rejectionTimestamp) {
                timerEl.textContent = 'Deadline passed';
                return;
            }

            const deadline = rejectionTimestamp + resubmitDuration;
            
            const intervalId = setInterval(() => {
                const now = new Date();
                const diff = deadline - now;

                if (diff <= 0) {
                    clearInterval(intervalId);
                    timerEl.textContent = 'Time expired!';
                    // Optionally hide the resubmit button
                    timerEl.nextElementSibling.style.display = 'none';
                    return;
                }
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                timerEl.textContent = `Time Left: ${hours}h ${minutes}m ${seconds}s`;
            }, 1000);
            countdownIntervals.push(intervalId);
        });
    };

    const loadSubmissions = async (userId) => {
        try {
            submissionsList.innerHTML = `<p class="empty-list-message">Loading your submissions...</p>`;
            const q = query(collectionGroup(db, 'submissions'), where("workerId", "==", userId), orderBy("submittedAt", "desc"));
            const querySnapshot = await getDocs(q);
            allSubmissions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            renderTabs();
            renderList();
        } catch (error) {
            console.error("Error fetching submissions:", error);
            submissionsList.innerHTML = `<p class="empty-list-message">Could not load your submissions. Please try again.</p>`;
        }
    };
    
    tabsContainer.addEventListener('click', (e) => {
        const tabButton = e.target.closest('.tab-btn');
        if (tabButton) {
            activeTab = tabButton.dataset.tab;
            renderTabs();
            renderList();
        }
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            renderHero();
            loadSubmissions(user.uid);
        } else { 
            window.location.href = '/login.html';
        }
    });
});