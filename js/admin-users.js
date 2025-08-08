// FILE: /js/admin-users.js

import { db } from '/js/firebase-config.js';
import { collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// A simple date formatter
const formatDate = (timestamp) => {
  if (!timestamp) return '—';
  // Firebase timestamp has to be converted to milliseconds for JS Date
  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Function to fetch and render all users
async function loadAllUsers() {
  const usersCollection = collection(db, 'users');
  // Order users by when they were created, newest first
  const q = query(usersCollection, orderBy('createdAt', 'desc'));

  const tbody = document.getElementById('tbody-users');
  
  try {
    const querySnapshot = await getDocs(q);
    
    // Clear the loading message
    tbody.innerHTML = ''; 

    if (querySnapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="5" class="a-empty">No users found.</td></tr>';
      return;
    }

    querySnapshot.forEach(doc => {
      const user = doc.data();
      const roleClass = user.role === 'worker' ? 'live' : 'pending';
      const roleText = user.role.charAt(0).toUpperCase() + user.role.slice(1);

      const row = `
        <tr>
          <td>${user.fullName || 'N/A'}</td>
          <td>${user.email || 'N/A'}</td>
          <td><span class="status ${roleClass}">${roleText}</span></td>
          <td>${formatDate(user.createdAt)}</td>
          <td><span class="status live">${user.status || 'active'}</span></td>
        </tr>
      `;
      tbody.insertAdjacentHTML('beforeend', row);
    });

  } catch (error) {
    console.error("Error loading users:", error);
    tbody.innerHTML = '<tr><td colspan="5" class="a-empty">Error loading user data.</td></tr>';
  }
}

// Initial load
loadAllUsers();