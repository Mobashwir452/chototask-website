// FILE: /js/admin-login.js
import { auth, db } from '/js/firebase-config.js';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const form = document.getElementById('adminLoginForm');
const errEl = document.getElementById('err');
const forgotBtn = document.getElementById('forgotBtn');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');

function showErr(msg){
  errEl.textContent = msg;
  errEl.style.display = 'block';
}

async function isAdmin(uid){
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() && snap.data().isAdmin === true;
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  errEl.style.display = 'none';
  try {
    const { user } = await signInWithEmailAndPassword(auth, emailInput.value.trim(), passInput.value);
    if (await isAdmin(user.uid)) {
      window.location.href = '/admin/index.html';
    } else {
      await signOut(auth);
      showErr('This account is not an admin. Ask an admin to set isAdmin: true in Firestore.');
    }
  } catch (err) {
    showErr(err.message || 'Sign in failed.');
  }
});

forgotBtn?.addEventListener('click', async () => {
  errEl.style.display = 'none';
  const email = emailInput.value.trim();
  if (!email) return showErr('Enter your email first, then click "Forgot Password".');
  try {
    await sendPasswordResetEmail(auth, email);
    showErr('Password reset email sent. Check your inbox.');
  } catch (err) {
    showErr(err.message || 'Could not send reset email.');
  }
});

// If already signed in and admin, auto-redirect
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  try {
    if (await isAdmin(user.uid)) {
      window.location.href = '/admin/index.html';
    }
  } catch {}
});



// BEFORE signInWithEmailAndPassword:
const btn = document.querySelector('.auth-submit');
const btnText = btn?.querySelector('.btn-text');
const spinner = btn?.querySelector('.btn-spinner');
if (btn){ btn.disabled = true; btnText.textContent = 'Signing in…'; spinner.style.display = 'inline-block'; }

// AFTER success/failure (in both branches):
if (btn){ btn.disabled = false; btnText.textContent = 'Sign In'; spinner.style.display = 'none'; }

