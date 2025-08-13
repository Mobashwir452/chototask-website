const menuToggle = document.getElementById("menu-toggle");
const sidebar = document.getElementById("admin-sidebar");
const closeSidebar = document.getElementById("close-sidebar");
const logoutBtn = document.getElementById("logout-btn");

// Open sidebar
menuToggle.addEventListener("click", () => {
  sidebar.classList.add("open");
});

// Close sidebar
closeSidebar.addEventListener("click", () => {
  sidebar.classList.remove("open");
});

// Logout
logoutBtn.addEventListener("click", () => {
  firebase.auth().signOut().then(() => {
    window.location.href = "admin-login.html";
  });
});
