// FILE: /worker/js/worker-tasks.js (FINAL MOBILE-FIRST REDESIGN)

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

    const renderTasks = (tasks) => {
        if (!taskListContainer) return;
        if (tasks.length === 0) {
            taskListContainer.innerHTML = `<p class="empty-list-message">No jobs found matching your criteria.</p>`;
            return;
        }

        taskListContainer.innerHTML = tasks.map(task => {
            const completed = task.submissionsApproved || 0;
            const needed = task.workersNeeded || 1;
            const progress = needed > 0 ? (completed / needed) * 100 : 0;
            const approvalTime = task.approvalTime || '24 Hours';
            const categoryIcon = getCategoryIcon(task.category);

            // This single HTML structure powers both mobile and desktop views
            return `
                <a href="/worker/job-details.html?id=${task.id}" class="task-card">
                    <div class="task-card__icon mobile-only">
                        <i class="fa-solid ${categoryIcon}"></i>
                    </div>
                    <div class="task-card__content mobile-only">
                        <div class="task-card__header">
                            <span class="task-card__title">${task.title}</span>
                            <span class="task-card__payout">৳${task.costPerWorker}</span>
                        </div>
                        </div>
                    <div class="task-card__chevron mobile-only">
                        <i class="fa-solid fa-chevron-right"></i>
                    </div>

                    <div class="desktop-only task-card__identity">
                        <h3 class="task-card__title">${task.title}</h3>
                        <span class="task-card__category">${task.category}</span>
                    </div>
                    <div class="desktop-only task-card__stats">
                        <div class="stat-item">
                            <div class="stat-label"><i class="stat-icon fa-solid fa-hand-holding-dollar"></i> Payout</div>
                            <strong>৳${task.costPerWorker}</strong>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label"><i class="stat-icon fa-solid fa-calendar-day"></i> Posted</div>
                            <strong>${timeAgo(task.createdAt.toDate())}</strong>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label"><i class="stat-icon fa-solid fa-users"></i> Slots</div>
                            <strong>${completed}/${needed}</strong>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label"><i class="stat-icon fa-solid fa-clock"></i> Approval</div>
                            <strong>${approvalTime}</strong>
                        </div>
                    </div>
                    <div class="desktop-only task-card__action">
                        <div class="btn-view-task">View Task</div>
                        <div class="progress-container">
                             <div class="progress-labels"><span>Filled</span><span>${progress.toFixed(0)}%</span></div>
                             <div class="progress-bar"><div class="progress-bar__fill" style="width: ${progress.toFixed(2)}%;"></div></div>
                        </div>
                    </div>
                </a>
            `;
        }).join('');
    };

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