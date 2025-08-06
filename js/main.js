const initializePage = () => {
    // Mobile Menu Functionality
    const menuBtn = document.getElementById('menu-btn');
    const closeMenuBtn = document.getElementById('close-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    // Check if these elements exist on the page before adding event listeners.
    // This prevents errors on pages that might not have a mobile menu.
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
            // We only close it if the click is on the container itself, not on its children.
            if (event.target === mobileMenu) {
                mobileMenu.classList.remove('active');
            }
        });
    }

    // You can add other global initializations here.
    // For example, setting up a "back to top" button, etc.
};

// The 'DOMContentLoaded' event fires when the initial HTML document has been completely loaded and parsed.
// The 'loadComponents' function from component-loader.js is also tied to this event.
// We need to make sure our page initialization runs *after* the components are loaded.
// A simple way is to wait for the components to load and then call initializePage.
document.addEventListener('DOMContentLoaded', () => {
    // The component loader is already running. We can safely assume the elements
    // will be available shortly after. A small timeout can ensure this.
    // A more robust solution might use custom events if needed for complex apps.
    setTimeout(initializePage, 100); // A small delay to ensure components are injected.
});
