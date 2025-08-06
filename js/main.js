/* FILE: js/main.js (Final Corrected Version) */

/**
 * This script waits for the custom 'componentsLoaded' event, which is dispatched
 * by component-loader.js after all HTML components have been successfully injected.
 * This is the most reliable way to ensure the menu buttons exist before we try to use them.
 */
document.addEventListener('componentsLoaded', () => {
    // Mobile Menu Functionality
    const menuBtn = document.getElementById('menu-btn');
    const closeMenuBtn = document.getElementById('close-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    // Safety check: only add listeners if all menu elements are now present.
    if (menuBtn && mobileMenu && closeMenuBtn) {
        
        // Event listener to open the menu.
        menuBtn.addEventListener('click', () => {
            mobileMenu.classList.add('active');
        });

        // Event listener to close the menu.
        closeMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
        });

        // Event listener to close the menu if the user clicks the background overlay.
        mobileMenu.addEventListener('click', (event) => {
            if (event.target === mobileMenu) {
                mobileMenu.classList.remove('active');
            }
        });
    } else {
        // If the buttons aren't found, log an error to the console for debugging.
        console.error("Mobile menu buttons not found after components loaded. Check element IDs.");
    }
});