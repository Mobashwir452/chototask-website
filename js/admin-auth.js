import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// This checks the user's status on every protected admin page
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is logged in, now check if they are an admin.
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().isAdmin === true) {
            // User is an admin. Allow them to see the page.
            console.log("Admin access granted for:", user.email);
        } else {
            // User is logged in but NOT an admin. Redirect them away.
            console.log("Access denied. User is not an admin.");
            window.location.href = '/'; // Redirect to public homepage
        }
    } else {
        // User is not logged in. Redirect them to the admin login page.
        console.log("Access denied. User not logged in.");
        window.location.href = '/admin/login.html'; // Redirect to admin login
    }
});

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
