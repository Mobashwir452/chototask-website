/* FILE: js/main.js (Final Corrected Version) */

document.addEventListener('componentsLoaded', () => {
    const openBtn = document.getElementById('menu-open-btn');
    const closeBtn = document.getElementById('menu-close-btn');
    const menuContainer = document.getElementById('mobile-menu-container');

    if (openBtn && closeBtn && menuContainer) {
        openBtn.addEventListener('click', () => {
            menuContainer.classList.add('is-open');
        });

        closeBtn.addEventListener('click', () => {
            menuContainer.classList.remove('is-open');
        });

        // Close menu if background is clicked
        menuContainer.addEventListener('click', (event) => {
            if (event.target === menuContainer) {
                menuContainer.classList.remove('is-open');
            }
        });
    } else {
        console.error("Essential menu elements not found. Check IDs: #menu-open-btn, #menu-close-btn, #mobile-menu-container");
    }
});