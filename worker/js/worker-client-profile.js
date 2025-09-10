// === FILE: /worker/js/worker-client-profile.js ===

import { auth, db } from '/js/firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs, limit, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {
    
    const loadingContainer = document.getElementById('loading-container');
    const profileContent = document.getElementById('profile-content');
    const summaryContainer = document.getElementById('client-summary-card');
    const statsContainer = document.getElementById('client-stats-card');
    const aboutContainer = document.getElementById('client-about-section');
    const reviewsContainer = document.getElementById('client-reviews-section');
    const jobsContainer = document.getElementById('client-jobs-section');

    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('id');

    if (!clientId) {
        loadingContainer.innerHTML = `<h1 class="loading-title">Client Not Found</h1>`;
        return;
    }

    const renderSummary = (data) => {
        const joinDate = data.memberSince ? data.memberSince.toDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A';
        const stats = data.stats || {};
        const rating = (stats.rating || 0).toFixed(1);
        const reviewCount = stats.reviewCount || 0;

        let avatarHTML = '';
        if (data.photoURL) {
            avatarHTML = `<img src="${data.photoURL}" alt="Client Avatar" class="summary-avatar">`;
        } else {
            const initials = (data.fullName || 'C').charAt(0).toUpperCase();
            avatarHTML = `<div class="summary-initials-avatar">${initials}</div>`;
        }

        summaryContainer.className = 'section-card client-summary-card';
        summaryContainer.innerHTML = `
            <div class="summary-avatar-wrapper">${avatarHTML}</div>
            <h1 class="summary-username">${data.fullName || 'ChotoTask Client'}</h1>
            <p class="summary-meta">${data.country || 'Unknown Location'} &bull; Joined ${joinDate}</p>
            <div class="summary-rating">
                <i class="fa-solid fa-star"></i>
                <span>${rating}/5 (${reviewCount} reviews)</span>
            </div>
        `;
    };

    const renderStats = (data) => {
        const stats = data.stats || {};
        statsContainer.className = 'section-card';
        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${stats.jobsPosted || 0}</div>
                    <div class="stat-label">Jobs Posted</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">৳${(stats.totalSpent || 0).toLocaleString()}+</div>
                    <div class="stat-label">Total Spent</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.approvalRate || 100}%</div>
                    <div class="stat-label">Approval Rate</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">~${stats.avgPaymentTime || 24}h</div>
                    <div class="stat-label">Avg. Payment Time</div>
                </div>
            </div>
        `;
    };
    
    const renderAbout = (data) => {
        if (!data.aboutMe) return;
        aboutContainer.className = 'section-card';
        aboutContainer.innerHTML = `
            <h3 class="section-title">About This Client</h3>
            <p class="about-text">${data.aboutMe}</p>
        `;
    };

    const renderReviews = (reviews) => {
        if (reviews.empty) return;
        reviewsContainer.className = 'section-card';
        let reviewsHTML = '<h3 class="section-title">Recent Reviews from Workers</h3>';
        reviews.forEach(doc => {
            const review = doc.data();
            reviewsHTML += `
                <div class="review-card">
                    <div class="review-header">
                        <span class="review-author">${review.workerName || 'A Worker'}</span>
                        <span class="review-rating"><i class="fa-solid fa-star"></i> ${review.rating}/5</span>
                    </div>
                    <p class="review-comment">${review.comment}</p>
                </div>
            `;
        });
        reviewsContainer.innerHTML = reviewsHTML;
    };

    const renderActiveJobs = (jobs) => {
        if (jobs.empty) return;
        jobsContainer.className = 'section-card';
        let jobsHTML = '<h3 class="section-title">Active Jobs by This Client</h3>';
        jobs.forEach(doc => {
            const job = { id: doc.id, ...doc.data() };
            jobsHTML += `
                <a href="/worker/job-details.html?id=${job.id}" class="job-list-item">
                    <span class="job-item-title">${job.title}</span>
                    <span class="job-item-payout">৳${job.costPerWorker}</span>
                </a>
            `;
        });
        jobsContainer.innerHTML = jobsHTML;
    };

    const loadProfileData = async () => {
        try {
            const clientDocRef = doc(db, "users", clientId);
            const clientDocSnap = await getDoc(clientDocRef);

            if (!clientDocSnap.exists()) throw new Error("Client profile does not exist.");

            const clientData = clientDocSnap.data();

            const reviewsQuery = query(collection(db, "users", clientId, "reviews"), orderBy("timestamp", "desc"), limit(5));
            const jobsQuery = query(collection(db, "jobs"), where("clientId", "==", clientId), where("status", "in", ["open", "active"]), limit(5));
            
            const [reviewsSnapshot, jobsSnapshot] = await Promise.all([
                getDocs(reviewsQuery),
                getDocs(jobsQuery)
            ]);
            
            renderSummary(clientData);
            renderStats(clientData);
            renderAbout(clientData);
            renderReviews(reviewsSnapshot);
            renderActiveJobs(jobsSnapshot);

            loadingContainer.style.display = 'none';
            profileContent.style.display = 'block';

        } catch (error) {
            console.error("Error loading client profile:", error);
            loadingContainer.innerHTML = `<h1 class="loading-title">Could not load profile.</h1><p style="text-align: center; color: var(--client-text-secondary);">${error.message}</p>`;
        }
    };
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadProfileData();
        } else { 
            window.location.href = '/login.html';
        }
    });
});