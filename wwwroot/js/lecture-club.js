// ============================================
// LECTURE CLUB PAGE
// Independent chat for each lecture club
// ============================================

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Generate a color for a genre based on its name
function getGenreColor(genreName) {
  let hash = 0;
  for (let i = 0; i < genreName.length; i++) {
    hash = genreName.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  const saturation = 45 + (Math.abs(hash) % 10);
  const lightness = 45 + (Math.abs(hash >> 8) % 10);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

let allClubsData = [];
let currentGenreFilter = "all";
let currentSearchTerm = "";
let currentSort = "name-asc";

// Display lecture clubs grouped by genre
async function displayLectureClubs() {
  const container = document.getElementById("lectureClubsContainer");
  try {
    console.log("Fetching lecture clubs...");
    const response = await fetch("/api/lectureclubs/by-genre");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const clubsByGenre = await response.json();
    console.log("Received lecture clubs:", clubsByGenre);

    if (!clubsByGenre || clubsByGenre.length === 0) {
      container.innerHTML = `
        <div class="no-clubs">
          <p>No lecture clubs available yet</p>
          <button onclick="window.location.href='/lecture-club-create.html'" class="create-club-btn">
            Create Your First Club
          </button>
        </div>`;
      updateResultsCount(0);
      return;
    }

    // Flatten data for filtering
    allClubsData = [];
    clubsByGenre.forEach((genreGroup) => {
      genreGroup.clubs.forEach((club) => {
        allClubsData.push({
          ...club,
          genre: genreGroup.genre,
        });
      });
    });
    console.log("Total clubs loaded:", allClubsData.length);

    applyFilters();
  } catch (error) {
    console.error("Error loading lecture clubs:", error);
    container.innerHTML =
      '<div class="error">Failed to load lecture clubs. Please try again.</div>';
    allClubsData = [];
    updateResultsCount(0);
  }
}

function renderClubs(clubs) {
  const container = document.getElementById("lectureClubsContainer");

  if (!clubs || clubs.length === 0) {
    container.innerHTML =
      '<div class="no-clubs">No clubs found matching your criteria</div>';
    return;
  }

  // Group by genre
  const clubsByGenre = {};
  clubs.forEach((club) => {
    if (!clubsByGenre[club.genre]) {
      clubsByGenre[club.genre] = [];
    }
    clubsByGenre[club.genre].push(club);
  });

  container.innerHTML = Object.entries(clubsByGenre)
    .map(([genre, genreClubs]) => {
      const genreColor = getGenreColor(genre);

      return `
        <div class="genre-section">
          <h2 class="genre-title">${escapeHtml(genre)}</h2>
          <hr class="genre-separator">
          <div class="clubs-row">
            ${genreClubs
              .map((club) => {
                // Use cover image if available, otherwise use colored background
                const coverStyle = club.coverImage
                  ? `background-image: url('${escapeHtml(
                      club.coverImage
                    )}'); background-size: cover; background-position: center;`
                  : `background-color: ${genreColor};`;

                return `
                  <div class="club-card" onclick='viewLectureClub(${club.id})'>
                    <div class="club-cover" style="${coverStyle}">
                      ${
                        !club.coverImage
                          ? `<div class="club-genre-badge">${escapeHtml(
                              genre
                            )}</div>`
                          : ""
                      }
                    </div>
                    <div class="club-info">
                      <div class="club-title">${escapeHtml(club.title)}</div>
                      <div class="club-creator">by ${escapeHtml(
                        club.createdBy.username
                      )}</div>
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      `;
    })
    .join("");
}

function applyFilters() {
  let filtered = [...allClubsData];

  // Genre filter
  if (currentGenreFilter !== "all") {
    filtered = filtered.filter((club) => club.genre === currentGenreFilter);
  }

  // Search
  if (currentSearchTerm) {
    filtered = filtered.filter((club) =>
      club.title.toLowerCase().includes(currentSearchTerm.toLowerCase())
    );
  }

  filtered = sortClubs(filtered, currentSort);

  updateResultsCount(filtered.length);
  renderClubs(filtered);
}

// Sort clubs
function sortClubs(clubs, sortType) {
  const sorted = [...clubs];

  switch (sortType) {
    case "name-asc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "name-desc":
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case "members-desc":
      return sorted.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
    case "members-asc":
      return sorted.sort((a, b) => (a.memberCount || 0) - (b.memberCount || 0));
    case "newest":
      return sorted.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    case "oldest":
      return sorted.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
    default:
      return sorted;
  }
}

function updateResultsCount(count) {
  const resultsElement = document.getElementById("results-count");
  if (!resultsElement) return;

  const total = allClubsData.length;

  if (count === total) {
    resultsElement.textContent = `Showing all clubs (${total})`;
  } else {
    resultsElement.textContent = `Showing ${count} of ${total} clubs`;
  }
}

function handleSearch(e) {
  currentSearchTerm = e.target.value.trim();
  applyFilters();
}

function handleGenreFilter(e) {
  // Remove active
  document.querySelectorAll(".lc-filter-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Change button as active
  e.target.classList.add("active");

  currentGenreFilter = e.target.dataset.genre;
  applyFilters();
}

function handleSort(e) {
  currentSort = e.target.value;
  applyFilters();
}


// JOIN WITH CODE
async function joinWithCode() {
  const codeInput = document.getElementById("club-code-input");
  const messageEl = document.getElementById("code-message");
  const code = codeInput.value.trim().toUpperCase();

  if (!code) {
    messageEl.textContent = "Please enter a club code";
    messageEl.className = "code-message error";
    return;
  }

  messageEl.textContent = "Validating code...";
  messageEl.className = "code-message info";

  try {
    const response = await fetch(
      `/api/lectureclubs/code/${encodeURIComponent(code)}`
    );
    const data = await response.json();

    if (response.ok && data.success) {
      messageEl.textContent = `Found: ${data.club.title}. Redirecting...`;
      messageEl.className = "code-message success";

      showToast(`Taking you to ${data.club.title}...`, "success");

      // Redirect to club page
      setTimeout(() => {
        window.location.href = `/lecture-club-page.html?id=${data.club.id}`;
      }, 1500);
    } else {
      messageEl.textContent = data.error || "Invalid code";
      messageEl.className = "code-message error";
      showToast("Invalid club code", "error");
    }
  } catch (error) {
    console.error("Error validating code:", error);
    messageEl.textContent = "Error validating code. Please try again.";
    messageEl.className = "code-message error";
    showToast("Error validating code", "error");
  }
}

// Toast notification
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast toast-${type} show`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// Allow Enter key to submit code
document.addEventListener("DOMContentLoaded", () => {
  const codeInput = document.getElementById("club-code-input");
  if (codeInput) {
    codeInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        joinWithCode();
      }
    });
  }

  // Event listener for search
  const searchInput = document.getElementById("club-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", handleSearch);
  }

  // Event listeners for filter buttons
  const filterButtons = document.querySelectorAll(".lc-filter-btn");
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", handleGenreFilter);
  });

  // Event listener for sort
  const sortSelect = document.getElementById("club-sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", handleSort);
  }

  // Initialize clubs display
  displayLectureClubs();
});

// View individual lecture club details
function viewLectureClub(clubId) {
  console.log("Viewing lecture club:", clubId);
  window.location.href = `/lecture-club-page.html?id=${clubId}`;
}

// View all clubs in a genre
function viewGenre(genre) {
  console.log("Viewing all clubs in genre:", genre);
  currentGenreFilter = genre;

  // Activate corresponding button
  document.querySelectorAll(".lc-filter-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.genre === genre) {
      btn.classList.add("active");
    }
  });

  applyFilters();
}
