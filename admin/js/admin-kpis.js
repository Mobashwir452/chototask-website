import { db } from '/js/firebase-config.js';
import { collection, query, where, getCountFromServer, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function count(coll, ...clauses){
  try{
    const q = clauses.length ? query(collection(db, coll), ...clauses) : collection(db, coll);
    const res = await getCountFromServer(q);
    return res.data().count || 0;
  }catch(err){
    console.error('KPI count failed for', coll, err);
    return 0;
  }
}

async function runKPIs(){
  // “Today” window for submissionsToday (00:00 → now)
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTs = Timestamp.fromDate(start);

  const [
    users, workers, clients,
    jobsPending,
    depositsPending,
    withdrawalsPending,
    submissionsToday,
    disputesOpen
  ] = await Promise.all([
    count('users'),
    count('users', where('role','==','worker')),
    count('users', where('role','==','client')),
    count('jobs', where('status','==','pending_review')),
    count('deposits', where('status','==','pending')),
    count('withdrawals', where('status','==','pending')),
    count('submissions', where('createdAt', '>=', startTs)),
    count('disputes', where('status','==','open')),
  ]);

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('kpi-users', users);
  set('kpi-workers', workers);
  set('kpi-clients', clients);
  set('kpi-jobs-pending', jobsPending);
  set('kpi-deposits', depositsPending);
  set('kpi-withdrawals', withdrawalsPending);
  set('kpi-submissions-today', submissionsToday);
  set('kpi-disputes', disputesOpen);
}

// ✅ Only run after admin auth is verified
document.addEventListener('adminReady', runKPIs);
