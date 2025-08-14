// FILE: /client/js/client-premium.js

document.addEventListener('componentsLoaded', () => {

    const notifyBtn = document.getElementById('notify-btn');
    const confirmationModal = document.getElementById('confirmation-modal');
    const modalOkBtn = document.getElementById('modal-ok-btn');

    if (notifyBtn) {
        notifyBtn.addEventListener('click', () => {
            if (confirmationModal) {
                confirmationModal.classList.add('is-visible');
            }
        });
    }

    if (modalOkBtn) {
        modalOkBtn.addEventListener('click', () => {
            if (confirmationModal) {
                confirmationModal.classList.remove('is-visible');
            }
        });
    }

});