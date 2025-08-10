/**
 * This script fetches and injects reusable HTML components into placeholders on the page.
 * It's designed to be robust and efficient.
 */
document.addEventListener('DOMContentLoaded', () => {
    // A map of placeholder IDs to the component HTML file paths.
    const components = {
        '#header-placeholder': 'components/header-public.html',
        '#footer-placeholder': 'components/footer.html',
        '#auth-header-placeholder': 'components/header-auth.html', // <-- ADD THIS LINE
    };

    const loadComponent = async (id, url) => {
        const placeholder = document.querySelector(id);
        if (!placeholder) return; // If placeholder doesn't exist on this page, do nothing.

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to load component: ${url} (Status: ${response.status})`);
            
            const html = await response.text();
            placeholder.innerHTML = html;
        } catch (error) {
            console.error(`Error loading component for ${id}:`, error);
            placeholder.innerHTML = `<p style="color: red; text-align: center;">Error: Could not load component from ${url}.</p>`;
        }
    };

    // Create a list of promises for all components to be loaded.
    const promises = Object.entries(components).map(([id, url]) => loadComponent(id, url));

    // Use Promise.all to wait for all components to be loaded.
    // After they are all loaded, dispatch a custom event to notify other scripts.
    Promise.all(promises).then(() => {
        // This custom event signals that all components are now in the DOM.
        document.dispatchEvent(new Event('componentsLoaded'));
    });
});



// FILE: /js/component-loader.js (add these lines)
document.addEventListener('DOMContentLoaded', () => {
    const components = {
        // ... your existing public and auth placeholders
        '#client-header-placeholder': 'components/client-header.html',
        '#client-bottom-nav-placeholder': 'components/client-bottom-nav.html',
        '#client-menu-placeholder': 'components/client-menu.html',
    };
    // ... rest of the script is the same
});