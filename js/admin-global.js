// This function loads reusable components for the admin panel
const loadAdminComponents = async () => {
    const components = {
        '#admin-sidebar-placeholder': '../components/admin-sidebar.html',
    };

    await Promise.all(Object.entries(components).map(async ([id, url]) => {
        const placeholder = document.querySelector(id);
        if (placeholder) {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Failed to load: ${url}`);
                const html = await response.text();
                placeholder.innerHTML = html;
            } catch (error) {
                console.error(`Error loading component for ${id}:`, error);
            }
        }
    }));
    
    // After components are loaded, dispatch an event
    document.dispatchEvent(new Event('adminComponentsLoaded'));
};

// This function initializes event listeners after components are ready
const initializeAdminPage = () => {
    // Logout functionality
    const logoutButton = document.getElementById('admin-logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            signOut(auth).then(() => {
                console.log("Admin logged out successfully.");
                window.location.href = '/admin/login.html';
            }).catch((error) => {
                console.error("Logout error:", error);
            });
        });
    }
};

// Run the component loader as soon as the DOM is ready
document.addEventListener('DOMContentLoaded', loadAdminComponents);
// Run the initializations after the components have been loaded
document.addEventListener('adminComponentsLoaded', initializeAdminPage);