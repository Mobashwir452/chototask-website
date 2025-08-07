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


/* FILE: js/main.js (Add this new code at the end) */

// --- Testimonial Slider Drag-to-Scroll Functionality ---
const slider = document.querySelector('.testimonial-slider');
if (slider) {
    let isDown = false;
    let startX;
    let scrollLeft;

    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        slider.classList.add('active');
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });

    slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.classList.remove('active');
    });

    slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.classList.remove('active');
    });

    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 2; // The multiplier '2' makes the scroll faster
        slider.scrollLeft = scrollLeft - walk;
    });
}