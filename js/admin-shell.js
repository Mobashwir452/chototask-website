// FILE: /js/admin-shell.js
import { auth } from '/js/firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

function openSidebar() {
  document.querySelector('.a-sidebar')?.classList.add('open');
  document.getElementById('a-backdrop')?.removeAttribute('hidden');
}
function closeSidebar() {
  document.querySelector('.a-sidebar')?.classList.remove('open');
  document.getElementById('a-backdrop')?.setAttribute('hidden','');
}

document.addEventListener('adminComponentsLoaded', () => {
  // Toggle open
  document.getElementById('a-menu-btn')?.addEventListener('click', openSidebar);
  // Close buttons/backdrop
  document.getElementById('a-close-btn')?.addEventListener('click', closeSidebar);
  document.getElementById('a-backdrop')?.addEventListener('click', closeSidebar);

  // Logout
  document.getElementById('a-logout-btn')?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '/admin/login.html';
  });
});
