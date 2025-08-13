// FILE: /client/js/client-activity.js

import { auth, db } from '/js/firebase-config.js';
import { collection, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {

    const feedContainer = document.getElementById('activity-feed-container');

    // Helper to map activity types to Font Awesome icons
    const getIconForType = (type) => {
        switch (type) {
            case 'job_posted': return 'fa-solid fa-briefcase';
            case 'deposit_approved': return 'fa-solid fa-check-circle';
            case 'deposit_requested': return 'fa-solid fa-arrow-down';
            case 'submission_approved': return 'fa-solid fa-user-check';
            case 'user_created': return 'fa-solid fa-user-plus';
            default: return 'fa-solid fa-info-circle';
        }
    };

    const renderActivityFeed = (activities) => {
        if (!feedContainer) return;
        if (activities.length === 0) {
            feedContainer.innerHTML = `<p class="empty-state" style="text-align: center; padding: 1rem;">No account activity found.</p>`;
            return;
        }

        const feedHTML = activities.map(item => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="${getIconForType(item.type)}"></i>
                </div>
                <div class="activity-content">
                    <p class="activity-text">${item.text}</p>
                    <p class="activity-timestamp">${item.timestamp ? item.timestamp.toDate().toLocaleString() : ''}</p>
                </div>
            </div>
        `).join('');
        
        feedContainer.innerHTML = `<div class="activity-feed">${feedHTML}</div>`;
    };

    onAuthStateChanged(auth, (user) => {
        if (user) {
            const q = query(
                collection(db, "activities"), 
                where("userId", "==", user.uid), 
                orderBy("timestamp", "desc")
            );

            onSnapshot(q, (snapshot) => {
                const activities = snapshot.docs.map(doc => doc.data());
                renderActivityFeed(activities);
            }, (error) => {
                console.error("Error fetching activity feed: ", error);
                feedContainer.innerHTML = `<p class="empty-state error" style="text-align: center; padding: 1rem;">Could not load activity.</p>`;
            });
        } else {
            window.location.href = '/login.html';
        }
    });
});