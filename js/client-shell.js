// FILE: /js/client-shell.js
import { auth } from '/js/firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// This event ensures the component HTML is loaded before we try to find the buttons
document.addEventListener('componentsLoaded', () => {
    const openMenuBtn = document.getElementById('open-menu-btn');
    const closeMenuBtn = document.getElementById('close-menu-btn');
    const menuOverlay = document.getElementById('menu-overlay');
    const logoutBtn = document.getElementById('logout-btn');

    openMenuBtn.addEventListener('click', () => menuOverlay.classList.add('visible'));
    closeMenuBtn.addEventListener('click', () => menuOverlay.classList.remove('visible'));
    menuOverlay.addEventListener('click', (e) => {
        if (e.target === menuOverlay) {
            menuOverlay.classList.remove('visible');
        }
    });

    logoutBtn.addEventListener('click', async () => {
        if (confirm("Are you sure you want to log out?")) {
            await signOut(auth);
            window.location.href = '/login.html';
        }
    });
});
