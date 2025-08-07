/* FILE: js/main.js (Final, Corrected Version) */

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
    
    // Testimonial Slider Drag-to-Scroll Functionality
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
            const walk = (x - startX) * 2;
            slider.scrollLeft = scrollLeft - walk;
        });
    }
});