const loadComponents = async () => {
    // A map of placeholder IDs to the component HTML file paths.
    const components = {
        '#header-placeholder': 'components/header-public.html',
        '#footer-placeholder': 'components/footer.html',
        // Add other components here as needed, e.g., for the logged-in user
        // '#app-header-placeholder': 'components/header-app.html',
    };

    // Use Promise.all to fetch all components in parallel for better performance.
    await Promise.all(Object.entries(components).map(async ([id, url]) => {
        // Find the placeholder element in the main document.
        const placeholder = document.querySelector(id);
        // If the placeholder exists on the current page...
        if (placeholder) {
            try {
                // ...fetch the component's HTML content.
                const response = await fetch(url);
                // Check if the fetch was successful.
                if (!response.ok) {
                    throw new Error(`Failed to load component: ${url}`);
                }
                // Get the HTML as text.
                const html = await response.text();
                // Inject the HTML into the placeholder element.
                placeholder.innerHTML = html;
            } catch (error) {
                // If there's an error, log it to the console for debugging.
                console.error(`Error loading component for ${id}:`, error);
                // Optionally display an error message in the placeholder.
                placeholder.innerHTML = `<p style="color: red;">Could not load component.</p>`;
            }
        }
    }));
};