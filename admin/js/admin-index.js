// FILE: /admin/js/admin-index.js (Corrected Version)

import { db } from '/js/firebase-config.js';
import { collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const fmt = (tsOrMs) => {
  if (!tsOrMs) return '—';
  const d = tsOrMs.seconds ? new Date(tsOrMs.seconds * 1000) : new Date(tsOrMs);
  return d.toLocaleString();
};

async function loadJobsPending() {
  const tbody = document.getElementById('tbody-jobs-pending');
  try {
    const q = query(collection(db, 'jobs'), where('status', '==', 'pending_review'), orderBy('createdAt', 'desc'), limit(6));
    const snap = await getDocs(q);
    tbody.innerHTML = '';
    if (snap.empty) return tbody.innerHTML = '<tr><td colspan="5" class="a-empty">No pending jobs</td></tr>';
    
    snap.forEach(docu => {
      const d = docu.data();
      tbody.insertAdjacentHTML('beforeend',
        `<tr>
          <td>${d.title || '—'}</td>
          <td>${d.clientEmail || d.clientId || '—'}</td>
          <td>$${(d.budgetTotal || 0).toFixed(2)}</td>
          <td>${fmt(d.createdAt)}</td>
          <td><span class="status pending">Pending</span></td>
        </tr>`);
    });
  } catch (error) {
    console.error("Error loading pending jobs:", error);
    tbody.innerHTML = '<tr><td colspan="5" class="a-empty error">Could not load jobs</td></tr>';
  }
}

async function loadDeposits() {
  const tbody = document.getElementById('tbody-deposits');
  try {
    const q = query(collection(db, 'depositRequests'), where('status', '==', 'pending'), orderBy('requestedAt', 'desc'), limit(6));
    const snap = await getDocs(q);
    tbody.innerHTML = '';
    if (snap.empty) return tbody.innerHTML = '<tr><td colspan="5" class="a-empty">No pending deposits</td></tr>';
    
    snap.forEach(docu => {
      const d = docu.data();
      tbody.insertAdjacentHTML('beforeend',
        `<tr>
          <td>${d.clientEmail || d.clientId || '—'}</td>
          <td>৳${(d.amount || 0).toLocaleString()}</td>
          <td>${d.methodName || '—'}</td>
          <td>${fmt(d.requestedAt)}</td>
          <td><span class="status pending">Pending</span></td>
        </tr>`);
    });
  } catch (error) {
    console.error("Error loading deposits:", error);
    tbody.innerHTML = '<tr><td colspan="5" class="a-empty error">Could not load deposits</td></tr>';
  }
}

async function loadWithdrawals() {
  const tbody = document.getElementById('tbody-withdrawals');
  try {
    // This function looks for the 'withdrawalRequests' collection.
    const q = query(collection(db, 'withdrawalRequests'), where('status', '==', 'pending'), orderBy('requestedAt', 'desc'), limit(6));
    const snap = await getDocs(q);
    tbody.innerHTML = '';
    if (snap.empty) return tbody.innerHTML = '<tr><td colspan="5" class="a-empty">No pending withdrawals</td></tr>';
    
    snap.forEach(docu => {
      const d = docu.data();
      tbody.insertAdjacentHTML('beforeend',
        `<tr>
          <td>${d.workerEmail || d.workerId || '—'}</td>
          <td>৳${(d.amount || 0).toLocaleString()}</td>
          <td>${d.method || '—'}</td>
          <td>${fmt(d.requestedAt)}</td>
          <td><span class="status pending">Pending</span></td>
        </tr>`);
    });
  } catch (error) {
    console.error("Error loading withdrawals:", error);
    tbody.innerHTML = '<tr><td colspan="5" class="a-empty error">Could not load withdrawals</td></tr>';
  }
}

// The Promise.all will now wait for all three functions to complete.
await Promise.all([loadJobsPending(), loadDeposits(), loadWithdrawals()]);