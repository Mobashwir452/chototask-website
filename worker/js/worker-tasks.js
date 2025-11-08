// FILE: /worker/js/worker-tasks.js (UPDATED FOR RACE CONDITION)

import { auth, db } from '/js/firebase-config.js';
import { collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('componentsLoaded', () => {

    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const sortFilter = document.getElementById('sort-filter');
    const taskListContainer = document.getElementById('task-list-container');
    
    let allFetchedTasks = [];

    const getCategoryIcon = (category) => {
        const map = {
            "Social Media": "fa-share-nodes",
            "Content Engagement": "fa-comments",
            "Data Entry": "fa-keyboard",
            "default": "fa-list-check"
        };
        return map[category] || map['default'];
    };

// ===================================================================
// === START: renderTasks ফাংশনটি আপডেট করা হয়েছে ===
// ===================================================================
const renderTasks = (tasks) => {
    if (!taskListContainer) return;
    if (tasks.length === 0) {
        taskListContainer.innerHTML = `<p class="empty-list-message">No jobs found matching your criteria.</p>`;
        return;
    }

    taskListContainer.innerHTML = tasks.map(task => {
        // --- CHANGED: স্লট কাউন্ট লজিক আপডেট করা হয়েছে ---
        const approved = task.submissionsApproved || 0;
        const pending = task.submissionsPending || 0; // নতুন: পেন্ডিং কাউন্ট যোগ করা হয়েছে
        const slotsTaken = approved + pending; // নতুন: এটিই স্লটের আসল সংখ্যা
        const needed = task.workersNeeded || 1;
        const progress = needed > 0 ? (slotsTaken / needed) * 100 : 0; // প্রোগ্রেস বারও আপডেট করা হয়েছে
        const approvalTime = task.approvalTime || '24 Hours';

        // --- Desktop Card HTML ---
        const desktopCardHTML = `
            <a href="/worker/job-details.html?id=${task.id}" class="task-card desktop-only">
                <div class="task-card__header">
                    <h3 class="task-card__title">${task.title}</h3>
                    <span class="task-card__category">${task.category}</span>
                </div>
                <div class="task-card__stats">
                    <div class="stat-item">
                        <i class="stat-icon fa-solid fa-users"></i>
                        <div class="stat-text">
                            <span class="stat-label">Slots</span>
                            <strong>${slotsTaken}/${needed}</strong>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="stat-icon fa-solid fa-calendar-day"></i>
                        <div class="stat-text">
                            <span class="stat-label">Posted</span>
                            <strong>${timeAgo(task.createdAt.toDate())}</strong>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="stat-icon fa-solid fa-clock"></i>
                        <div class="stat-text">
                            <span class="stat-label">Approval</span>
                            <strong>${approvalTime}</strong>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="stat-icon fa-solid fa-hand-holding-dollar"></i>
                        <div class="stat-text">
                            <span class="stat-label">Payout</span>
                            <strong>৳${task.costPerWorker}</strong>
                        </div>
                    </div>
                </div>
                <div class="task-card__footer">
                    <div class="progress-container">
                        <div class="progress-labels">
                            <span>Progress</span>
                            <span>${progress.toFixed(0)}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-bar__fill" style="width: ${progress.toFixed(2)}%;"></div>
                        </div>
                    </div>
                    <div class="btn-view-task">View Task</div>
                </div>
            </a>
        `;

        // --- Mobile Card HTML ---
        const mobileCardHTML = `
            <a href="/worker/job-details.html?id=${task.id}" class="task-card mobile-only">
                <div class="task-card__header">
                    <h3 class="task-card__title">${task.title}</h3>
                    <span class="task-card__category">${task.category}</span>
                </div>
                <div class="task-card__stats-grid">
                    <div class="stat-item-mobile">
                        <i class="fa-solid fa-hand-holding-dollar stat-icon-mobile"></i>
                        <div class="stat-text-mobile">
                            <span class="stat-label-mobile">Payout</span>
                            <strong>৳${task.costPerWorker}</strong>
                        </div>
                    </div>
                    <div class="stat-item-mobile">
                        <i class="fa-solid fa-users stat-icon-mobile"></i>
                        <div class="stat-text-mobile">
                            <span class="stat-label-mobile">Slots</span>
                            <strong>${slotsTaken}/${needed}</strong>
                        </div>
                    </div>
                    <div class="stat-item-mobile">
                        <i class="fa-solid fa-calendar-day stat-icon-mobile"></i>
                        <div class="stat-text-mobile">
                            <span class="stat-label-mobile">Posted</span>
                            <strong>${timeAgo(task.createdAt.toDate())}</strong>
                        </div>
                    </div>
                    <div class="stat-item-mobile">
                        <i class="fa-solid fa-clock stat-icon-mobile"></i>
                        <div class="stat-text-mobile">
                            <span class="stat-label-mobile">Approval</span>
                            <strong>${approvalTime}</strong>
                        </div>
                    </div>
                </div>
                <div class="mobile-progress-and-button">
                    <div class="progress-container-mobile">
                        <div class="progress-labels-mobile">
                            <span>Progress</span>
                            <span>${progress.toFixed(0)}%</span>
                        </div>
                        <div class="progress-bar-mobile">
                            <div class="progress-bar__fill-mobile" style="width: ${progress.toFixed(2)}%;"></div>
                        </div>
                    </div>
                    <div class="btn-view-task">View Task</div>
                </div>
            </a>
        `;

        return desktopCardHTML + mobileCardHTML;
    }).join('');
};
// ===================================================================
// === END: renderTasks ফাংশন আপডেট ===
// ===================================================================

    const fetchAndRenderTasks = async () => {
        const category = categoryFilter.value;
        const sort = sortFilter.value;
        taskListContainer.innerHTML = `<p class="empty-list-message">Loading tasks...</p>`;
        
        try {
            const jobsRef = collection(db, "jobs");
            let q = query(jobsRef, where("status", "in", ["open", "active"]));

            if (category !== 'all') {
                q = query(q, where("category", "==", category));
            }

            if (sort === 'newest') {
                q = query(q, orderBy("createdAt", "desc"));
            } else if (sort === 'payout_high') {
                q = query(q, orderBy("costPerWorker", "desc"));
            } else if (sort === 'payout_low') {
                q = query(q, orderBy("costPerWorker", "asc"));
            }

            const querySnapshot = await getDocs(q);
            allFetchedTasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            filterAndRender();
        } catch (error) {
            console.error("Error fetching tasks: ", error);
            taskListContainer.innerHTML = `<p class="empty-list-message">Could not load tasks. Please try again.</p>`;
        }
    };
    
    const filterAndRender = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredTasks = allFetchedTasks.filter(task => 
            task.title.toLowerCase().includes(searchTerm)
        );
        renderTasks(filteredTasks);
    };
    
    function timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return "Just now";
    }

    categoryFilter.addEventListener('change', fetchAndRenderTasks);
    sortFilter.addEventListener('change', fetchAndRenderTasks);
    searchInput.addEventListener('input', filterAndRender);
    onAuthStateChanged(auth, (user) => { if (user) fetchAndRenderTasks(); else window.location.href = '/login.html'; });
});