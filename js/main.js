/**
 * This script handles page-specific interactions, like the mobile menu.
 * It waits for the 'componentsLoaded' event before running to ensure all elements are available.
 */
const initializePageInteractions = () => {
    // Mobile Menu Functionality
    const menuBtn = document.getElementById('menu-btn');
    const closeMenuBtn = document.getElementById('close-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    // Safety check: only run if all menu elements are present.
    if (menuBtn && mobileMenu && closeMenuBtn) {
        // Event listener to open the menu.
        menuBtn.addEventListener('click', () => {
            mobileMenu.classList.add('active');
        });

        // Event listener to close the menu.
        closeMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
        });

        // Optional: Close the menu if the user clicks on the background overlay.
        mobileMenu.addEventListener('click', (event) => {
            if (event.target === mobileMenu) {
                mobileMenu.classList.remove('active');
            }
        });
    }
};

// Listen for the custom 'componentsLoaded' event from component-loader.js
// This is the professional way to ensure interactions are initialized only after the dynamic content is ready.
document.addEventListener('componentsLoaded', initializePageInteractions);
