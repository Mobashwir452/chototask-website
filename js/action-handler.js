// FILE: /js/action-handler.js
import { auth } from '/js/firebase-config.js';
import { applyActionCode } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const titleEl = document.getElementById('action-title');
const messageEl = document.getElementById('action-message');

async function handleAction() {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const actionCode = urlParams.get('oobCode');

    switch (mode) {
        case 'verifyEmail':
            try {
                await applyActionCode(auth, actionCode);
                titleEl.textContent = 'Email Verified!';
                messageEl.textContent = 'Your account has been successfully verified. Redirecting you to the login page...';
                // Redirect to login page with a success message
                setTimeout(() => {
                    window.location.href = '/login.html?verified=true';
                }, 3000);
            } catch (error) {
                titleEl.textContent = 'Verification Failed';
                messageEl.textContent = 'This verification link is invalid or has expired. Please try signing up again.';
            }
            break;
        // In the future, this can also handle password resets
        // case 'resetPassword':
        //     // Handle password reset flow
        //     break;
        default:
            titleEl.textContent = 'Invalid Action';
            messageEl.textContent = 'The link you followed is not valid.';
    }
}

handleAction();