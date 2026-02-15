// ============================================
// USER PROFILE - Cleaned Version
// ============================================

let currentUser = null;

// INITIALIZATION
async function checkAuthentication() {
  try {
    const response = await fetch("/api/check-auth");
    const data = await response.json();

    if (!data.isAuthenticated) {
      window.location.href = "user-login.html";
      return false;
    }

    currentUser = {
      userId: data.userId,
      username: data.username,
      role: data.role,
    };

    console.log("User authenticated:", currentUser);
    return true;
  } catch (error) {
    console.error("Error verifying authentication:", error);
    window.location.href = "user-login.html";
    return false;
  }
}

async function loadUserProfile() {
  const isAuthenticated = await checkAuthentication();

  if (!isAuthenticated) {
    return;
  }

  await loadUserData();
  await loadPendingInvitations();
  await getUserStatistics();
}

async function loadUserData() {
  if (!currentUser) return;

  try {
    const response = await fetch(`/api/users/${currentUser.userId}/profile`);

    if (response.ok) {
      const profileData = await response.json();
      currentUser = { ...currentUser, ...profileData };
    }

    updateUserInfo();
  } catch (error) {
    console.error("Error loading profile data:", error);
    updateUserInfo();
  }
}

function updateUserInfo() {
  const userNameElement = document.querySelector(".user-profile h2");
  if (userNameElement && currentUser) {
    userNameElement.textContent = currentUser.username;
  }

  const userIdElement = document.querySelector(".user-id");
  if (userIdElement && currentUser) {
    userIdElement.textContent = `ID: ${currentUser.userId}`;
  }

  const userRoleElement = document.querySelector(".user-role");
  if (userRoleElement && currentUser) {
    userRoleElement.textContent = `Role: ${currentUser.role}`;
  }
}

// LOGOUT
async function logout() {
  try {
    const response = await fetch("/api/logout", {
      method: "POST",
    });

    const data = await response.json();

    if (data.success) {
      console.log("Logout successful");
      window.location.href = "user-login.html";
    } else {
      alert("Error during logout");
    }
  } catch (error) {
    console.error("Error during logout:", error);
    window.location.href = "user-login.html";
  }
}

// INVITATIONS
async function loadPendingInvitations() {
  if (!currentUser) return;

  try {
    const response = await fetch(
      `/api/users/${currentUser.userId}/invitations`
    );

    if (!response.ok) {
      return;
    }

    const invitations = await response.json();
    displayInvitations(invitations);
  } catch (error) {
    console.error("Error loading invitations:", error);
  }
}

function displayInvitations(invitations) {
  const container = document.getElementById("invitations-container");

  if (!container) return;

  if (!invitations || invitations.length === 0) {
    container.innerHTML =
      '<p class="no-invitations">No pending invitations</p>';
    return;
  }

  container.innerHTML = invitations
    .map(
      (inv) => `
    <div class="invitation-card">
      <div class="invitation-header">
        <span class="club-genre-badge">${escapeHtml(inv.clubGenre)}</span>
      </div>
      <h3 class="invitation-club-title">${escapeHtml(inv.clubTitle)}</h3>
      <p class="invitation-text">
        <strong>${escapeHtml(
          inv.invitedBy
        )}</strong> invited you to join this club
      </p>
      <div class="invitation-code-section">
        <label class="invitation-code-label">Your invitation code:</label>
        <div class="invitation-code-box">
          <span class="invitation-code">${inv.invitationCode || "N/A"}</span>
          <button class="btn-copy-small" onclick="copyInvitationCode('${
            inv.invitationCode
          }')">
            Copy
          </button>
        </div>
        <p class="invitation-code-hint">
          Enter this code on the Lecture Clubs page to access the club
        </p>
      </div>
      
      <div class="invitation-actions">
        <button class="btn-link" onclick="goToClubsPage()">
          Go to Clubs Page
        </button>
      </div>
    </div>
  `
    )
    .join("");
}

// STATISTICS
async function getUserStatistics() {
  if (!currentUser) return null;

  try {
    const response = await fetch(`/api/users/${currentUser.userId}/stats`);

    if (!response.ok) {
      throw new Error("Error loading statistics");
    }

    const stats = await response.json();
    displayStatistics(stats);
    return stats;
  } catch (error) {
    console.error("Error loading statistics:", error);
    return null;
  }
}

function displayStatistics(stats) {
  const container = document.getElementById("stats-container");
  if (!container || !stats) return;

  container.innerHTML = `
    <div class="stat-item">
      <span class="stat-value">${stats.booksRead || 0}</span>
      <span class="stat-label">Books Read</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">${stats.currentlyReading || 0}</span>
      <span class="stat-label">Reading Now</span>
    </div>
  `;
}

// UTILITY FUNCTIONS
function copyInvitationCode(code) {
  if (!code) return;

  navigator.clipboard
    .writeText(code)
    .then(() => {
      showToast("Code copied to clipboard!", "success");
    })
    .catch((err) => {
      console.error("Failed to copy:", err);
      showToast("Failed to copy code", "error");
    });
}

function goToClubsPage() {
  window.location.href = "/lecture-club.html";
}

function showToast(message, type = "info") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `toast toast-${type} show`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// INITIALIZATION ON PAGE LOAD
console.log("User profile page loaded");
loadUserProfile();
