import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

function go(path){ location.href = path; }

onAuthStateChanged(auth, async (user) => {
  if (!user) return go('/admin/login.html');
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists() || snap.data().isAdmin !== true) {
    await signOut(auth);
    return go('/admin/login.html');
  }
  document.dispatchEvent(new Event('adminReady'));
  // After components are loaded, mark active link + sidebar toggle
  document.addEventListener('adminComponentsLoaded', () => {
    const path = location.pathname;
    document.querySelectorAll('.a-nav-link').forEach(a => {
      if (a.getAttribute('href') === path) a.classList.add('active');
    });
    const btn = document.getElementById('a-menu-btn');
    const sidebar = document.querySelector('.a-sidebar');
    if (btn && sidebar) btn.addEventListener('click', () => sidebar.classList.toggle('open'));
  });
});
