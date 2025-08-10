/**
 * This script fetches and injects reusable HTML components into placeholders on the page.
 * It's designed to be robust and efficient.
 */
document.addEventListener('DOMContentLoaded', () => {
    // A single, unified map of ALL component placeholders for the entire site.
    const components = {
        // Public Site Components
        '#header-placeholder': '/components/header-public.html',
        '#footer-placeholder': '/components/footer.html',

        // Auth Pages Component
        '#auth-header-placeholder': '/components/header-auth.html',

        // Client Dashboard Components
        '#client-header-placeholder': '/components/client-header.html',
        '#client-bottom-nav-placeholder': '/components/client-bottom-nav.html',
        '#client-menu-placeholder': '/components/client-menu.html'
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

    // After all components are loaded, dispatch a custom event to notify other scripts.
    Promise.all(promises).then(() => {
        document.dispatchEvent(new Event('componentsLoaded'));
    });
});
