// FILE: /client/js/client-activity.js

import { auth, db } from '/js/firebase-config.js';
import { collection, query, where, onSnapshot, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {

    const activityFilters = document.getElementById('activity-filters');
    const activityFeed = document.getElementById('activity-feed');
    let currentUserId = null;
    let unsubscribe; // To store the Firestore listener

    const filterMap = {
        all: [],
        jobs: ['JOB_POSTED'],
        submissions: ['SUBMISSION_NEW', 'SUBMISSION_APPROVED', 'SUBMISSION_REJECTED'],
        wallet: ['DEPOSIT_SUCCESS', 'deposit_requested'],
        tickets: ['TICKET_CREATED', 'TICKET_REPLY_ADMIN']
    };

    const getActivityIcon = (type) => {
        switch (type) {


            case 'deposit_requested':
            return { class: 'icon-wallet', icon: 'fa-solid fa-arrow-down-to-line' };
            case 'DEPOSIT_SUCCESS':
                return { class: 'icon-wallet', icon: 'fa-solid fa-wallet' };
            case 'JOB_POSTED':
                return { class: 'icon-jobs', icon: 'fa-solid fa-briefcase' };
            case 'SUBMISSION_NEW':
                return { class: 'icon-submissions', icon: 'fa-solid fa-inbox' };
            case 'SUBMISSION_APPROVED':
                return { class: 'icon-submissions', icon: 'fa-solid fa-check' };
            case 'SUBMISSION_REJECTED':
                return { class: 'icon-warning', icon: 'fa-solid fa-times' };
            case 'TICKET_CREATED':
                return { class: 'icon-tickets', icon: 'fa-solid fa-ticket' };
            case 'TICKET_REPLY_ADMIN':
                return { class: 'icon-tickets', icon: 'fa-solid fa-headset' };
            default:
                return { class: 'icon-wallet', icon: 'fa-solid fa-bell' };
        }
    };

    const renderActivities = (activities) => {
        if (!activityFeed) return;
        if (activities.length === 0) {
            activityFeed.innerHTML = '<p class="empty-list-message">No activity found for this category.</p>';
            return;
        }

        activityFeed.innerHTML = activities.map(activity => {
            const iconInfo = getActivityIcon(activity.type);
            const timestamp = activity.timestamp ? timeAgo(activity.timestamp.toDate()) : '...';
            const isClickable = activity.refLink ? 'is-clickable' : '';
            const tag = activity.refLink ? 'a' : 'div';
            const href = activity.refLink ? `href="${activity.refLink}"` : '';
            
            return `
                <${tag} class="activity-card ${isClickable}" ${href}>
                    <div class="activity-icon ${iconInfo.class}">
                        <i class="${iconInfo.icon}"></i>
                    </div>
                    <div class="activity-details">
                        <p class="activity-message">${activity.text}</p>
                        <p class="activity-timestamp">${timestamp}</p>
                    </div>
                </${tag}>
            `;
        }).join('');
    };

    const fetchAndRenderActivities = (filter = 'all') => {
        if (!currentUserId) return;
        if (unsubscribe) unsubscribe(); // Detach old listener

        const activitiesRef = collection(db, 'activities');
        let q;
        const filterTypes = filterMap[filter];

        if (filterTypes.length > 0) {
            q = query(activitiesRef, 
                where("userId", "==", currentUserId), 
                where("type", "in", filterTypes), 
                orderBy("timestamp", "desc"), 
                limit(50)
            );
        } else {
            q = query(activitiesRef, 
                where("userId", "==", currentUserId), 
                orderBy("timestamp", "desc"), 
                limit(50)
            );
        }

        unsubscribe = onSnapshot(q, (snapshot) => {
            const activities = [];
            snapshot.forEach(doc => activities.push({ id: doc.id, ...doc.data() }));
            renderActivities(activities);
        }, (error) => {
            console.error("Error fetching activities:", error);
            activityFeed.innerHTML = '<p class="empty-list-message">Could not load activity. Please try again later.</p>';
        });
    };

    // --- Event Listeners ---
    if (activityFilters) {
        activityFilters.addEventListener('click', (e) => {
            if (e.target.matches('.filter-btn')) {
                activityFilters.querySelector('.active').classList.remove('active');
                e.target.classList.add('active');
                fetchAndRenderActivities(e.target.dataset.filter);
            }
        });
    }

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            fetchAndRenderActivities(); // Fetch initial 'all'
        } else {
            window.location.href = '/login.html';
        }
    });

    // --- Helper Function for Timestamps ---
    function timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    }
});