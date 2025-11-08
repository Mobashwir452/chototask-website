/* FILE: js/auth-redirect.js (NEW FILE) */

// Import necessary functions and modules from Firebase
import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * This function runs as soon as the page loads.
 * It checks the user's authentication state.
 */
onAuthStateChanged(auth, async (user) => {
    
    // Check if the user object exists (i.e., user is logged in)
    if (user) {
        
        // User is logged in.
        // We need to fetch their role from the Firestore database.
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                // User document found. Get the role.
                const userData = userDoc.data();
                const role = userData.role;

                // Redirect the user to their correct dashboard
                // This logic is similar to your handleLogin function
                switch (role) {
                    case 'admin':
                        window.location.href = '/admin/index.html';
                        break;
                    case 'worker':
                        window.location.href = '/worker/dashboard.html';
                        break;
                    case 'client':
                        window.location.href = '/client/dashboard.html';
                        break;
                    default:
                        // If role is unknown, just stay on index
                        console.log("Logged in user has an unknown role.");
                }
            } else {
                // This case is unlikely but good to handle
                // The user is authenticated but has no data in Firestore.
                console.error("User is logged in but no data found in database.");
                // You could sign them out here if needed: await signOut(auth);
            }
        } catch (error) {
            console.error("Error fetching user data for redirect:", error);
        }
        
    } else {
        // User is NOT logged in.
        // Do nothing. Let them stay on the index.html (public homepage).
        console.log("No user logged in, showing public homepage.");
    }
});