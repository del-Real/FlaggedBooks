// ============================================
// MY BOOKS PAGE
// Handles displaying currently reading, favorite and completed books and lecture clubs
// Supports viewing own profile and other users' profiles
// ============================================

let currentViewingUserId = null;
let currentViewingUsername = null;
let currentLoggedInUser = null;
let isViewingOwnProfile = false;
let showProgressTracking = false;

// INITIALIZATION
async function initializeMyBooksPage() {
  try {
    // Check if user is logged in
    const authData = await checkAuthentication();
    if (!authData) {
      // Not logged in, redirect to login
      window.location.href = "user-login.html";
      return;
    }

    currentLoggedInUser = authData;

    // Get user ID from URL (e.g., /my-books.html?user=5)
    const urlParams = new URLSearchParams(window.location.search);
    const userIdParam = urlParams.get("user");

    if (userIdParam) {
      // Viewing another user's profile
      currentViewingUserId = parseInt(userIdParam);
      isViewingOwnProfile = currentViewingUserId === currentLoggedInUser.userId;
    } else {
      // Viewing own profile
      currentViewingUserId = currentLoggedInUser.userId;
      isViewingOwnProfile = true;
    }

    // Load progress tracking preference
    loadProgressTrackingPreference();

    // Load user profile info
    await loadUserProfileInfo();

    // Load books and clubs
    await loadCurrentlyReading();
    await loadFavoriteBooks();
    await loadCompletedBooks();
    await loadLectureClubs();

    // Update page title if viewing another user
    if (!isViewingOwnProfile) {
      updatePageTitle();
    }
  } catch (error) {
    console.error("Error initializing my books page:", error);
    showError("Error loading profile. Please try again.");
  }
}

// PROGRESS TRACKING PREFERENCE
function loadProgressTrackingPreference() {
  // Load preference for any user (own profile or viewing others)
  const storageKey = `showProgressTracking_user_${currentViewingUserId}`;
  const stored = localStorage.getItem(storageKey);
  showProgressTracking = stored === "true";
}

function toggleProgressTracking() {
  showProgressTracking = !showProgressTracking;
  const storageKey = `showProgressTracking_user_${currentViewingUserId}`;
  localStorage.setItem(storageKey, showProgressTracking.toString());

  const progressTrackers = document.querySelectorAll(".progress-tracker");
  const completeButtons = document.querySelectorAll(".btn-complete-book");
  const unavailableMessages = document.querySelectorAll(
    ".progress-unavailable"
  );

  if (showProgressTracking) {
    // Show progress trackers, hide complete buttons
    progressTrackers.forEach((tracker) => (tracker.style.display = "block"));
    completeButtons.forEach((btn) => (btn.style.display = "none"));
    unavailableMessages.forEach((msg) => (msg.style.display = "block"));
  } else {
    // Hide progress trackers, show complete buttons
    progressTrackers.forEach((tracker) => (tracker.style.display = "none"));
    completeButtons.forEach((btn) => (btn.style.display = "block"));
    unavailableMessages.forEach((msg) => (msg.style.display = "none"));
  }

  // Update botton
  const toggleBtn = document.querySelector(".progress-toggle-btn");
  if (toggleBtn) {
    toggleBtn.textContent = showProgressTracking
      ? "Hide Progress Tracking"
      : "Show Progress Tracking";
  }

  // Reattach event listeners if necessary
  if (isViewingOwnProfile && showProgressTracking) {
    setTimeout(() => attachProgressListeners(), 100);
  } else if (isViewingOwnProfile && !showProgressTracking) {
    setTimeout(() => attachCompleteListeners(), 100);
  }
}

// AUTHENTICATION
async function checkAuthentication() {
  try {
    const response = await fetch("/api/check-auth");

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.isAuthenticated) {
      return null;
    }

    return {
      userId: data.userId,
      username: data.username,
      role: data.role,
    };
  } catch (error) {
    console.error("Error checking authentication:", error);
    return null;
  }
}

// LOAD USER PROFILE INFO
async function loadUserProfileInfo() {
  try {
    const response = await fetch(`/api/users/${currentViewingUserId}/profile`);

    if (!response.ok) {
      throw new Error("User not found");
    }

    const userData = await response.json();
    currentViewingUsername = userData.username;

    // Update UI with user info
    updateUserInfoDisplay(userData);
  } catch (error) {
    console.error("Error loading user profile:", error);
    // Fallback to logged in user info if viewing own profile
    if (isViewingOwnProfile) {
      currentViewingUsername = currentLoggedInUser.username;
      updateUserInfoDisplay({
        username: currentLoggedInUser.username,
        role: currentLoggedInUser.role,
      });
    }
  }
}

function updateUserInfoDisplay(userData) {
  // Update username display if element exists
  const usernameElement = document.querySelector(".user-profile h2");
  if (usernameElement) {
    usernameElement.textContent = userData.username;
  }

  // Update page header
  const header = document.querySelector(".profile-books h1, .header-books");
  if (header && !isViewingOwnProfile) {
    header.textContent = `${userData.username}'s Books`;
  }
}

function updatePageTitle() {
  document.title = `${
    currentViewingUsername || "User"
  }'s Books | Flagged Books`;
}

// LOAD CURRENTLY READING BOOKS
async function loadCurrentlyReading() {
  try {
    const endpoint = isViewingOwnProfile
      ? "/api/user/currently-reading"
      : `/api/user/${currentViewingUserId}/currently-reading`;

    const response = await fetch(endpoint);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized");
      }
      throw new Error("Error loading currently reading books");
    }

    const books = await response.json();

    const booksWithDetails = await Promise.all(
      books.map(async (book) => {
        if (book.totalPages || book.numberOfPages) {
          return book;
        }

        try {
          if (book.isbn) {
            const detailResponse = await fetch(`/api/books/isbn/${book.isbn}`);
            if (detailResponse.ok) {
              const bookDetails = await detailResponse.json();
              return { ...book, ...bookDetails };
            }
          }
        } catch (error) {
          console.error("Error fetching book details for:", book.title, error);
        }
        return book;
      })
    );

    console.log("Books with details:", booksWithDetails);
    const normalizedBooks = booksWithDetails.map(normalizeBookData);

    displayCurrentlyReading(normalizedBooks);
  } catch (error) {
    console.error("Error loading currently reading:", error);
    displayCurrentlyReading([]);
  }
}

// LOAD FAVORITE BOOKS
async function loadFavoriteBooks() {
  try {
    const endpoint = isViewingOwnProfile
      ? "/api/user/favorites"
      : `/api/user/${currentViewingUserId}/favorites`;

    const response = await fetch(endpoint);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized");
      }
      throw new Error("Error loading favorite books");
    }

    const books = await response.json();
    displayFavoriteBooks(books);
  } catch (error) {
    console.error("Error loading favorites:", error);
    displayFavoriteBooks([]);
  }
}

// LOAD COMPLETED BOOKS
async function loadCompletedBooks() {
  try {
    const endpoint = isViewingOwnProfile
      ? "/api/user/completed"
      : `/api/user/${currentViewingUserId}/completed`;

    const response = await fetch(endpoint);

    if (!response.ok) {
      if (response.status === 401) throw new Error("unauthorized");
      throw new Error("Error loading completed books");
    }

    const books = await response.json();
    const normalizedBooks = books.map(normalizeBookData);
    displayCompletedBooks(normalizedBooks);
  } catch (error) {
    console.error("Error loading completed books:", error);
    displayCompletedBooks([]);
  }
}

// LOAD LECTURE CLUBS
async function loadLectureClubs() {
  try {
    const response = await fetch(
      `/api/users/${currentViewingUserId}/lecture-clubs`
    );

    if (!response.ok) {
      if (response.status === 404) {
        // User not found
        throw new Error("User not found");
      }
      throw new Error("Error loading lecture clubs");
    }

    const clubs = await response.json();
    displayLectureClubs(clubs);
  } catch (error) {
    console.error("Error loading lecture clubs:", error);
    displayLectureClubs([]);
  }
}

// DISPLAY CURRENTLY READING
function displayCurrentlyReading(books) {
  const container = document.querySelector(
    ".currently-reading .profile-book-grid"
  );

  if (!container) {
    console.error("Container for currently reading not found");
    return;
  }

  if (!books || books.length === 0) {
    const emptyMessage = isViewingOwnProfile
      ? "No books currently reading. Start adding books from the Discover page!"
      : `${currentViewingUsername} is not reading any books right now.`;

    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #666; padding: 2rem;">${emptyMessage}</p>`;
    return;
  }

  const MAX_VISIBLE = 8;
  const hasMore = books.length > MAX_VISIBLE;

  let html = books
    .map((book, index) => {
      const hiddenClass = index >= MAX_VISIBLE ? "hidden" : "";
      return createBookCard(book, "reading", hiddenClass);
    })
    .join("");

  if (hasMore) {
    html += `
        <div class="show-more-container">
            <button class="btn-show-more" onclick="toggleShowMoreBooks('currently-reading')">
                Show More Books
            </button>
        </div>
        `;
  }

  html += `
    <div class="progress-toggle-container" style="grid-column: 1/-1; text align: center;margin:2rem auto;">
    <button class="progress-toggle-btn" onclick="toggleProgressTracking()">
            ${
              showProgressTracking
                ? "Hide Progress Tracking"
                : "Show Progress Tracking"
            }
        </button>
    </div>
    `;

  container.innerHTML = html;

  // Event linsteners for progress updates (only for own profile)
  if (isViewingOwnProfile && showProgressTracking) {
    attachProgressListeners();
  }

  // Event linsteners for complete buttons (only for own profile when tracking hidden)
  if (isViewingOwnProfile && !showProgressTracking) {
    attachCompleteListeners();
  }
}

// DISPLAY FAVORITE BOOKS
function displayFavoriteBooks(books) {
  const container = document.querySelector(".top-books .profile-book-grid");

  if (!container) {
    console.error("Container for favorite books not found");
    return;
  }

  if (!books || books.length === 0) {
    const emptyMessage = isViewingOwnProfile
      ? "No favorite books yet. Add your favorites from the Discover page!"
      : `${currentViewingUsername} hasn't added any favorites yet.`;

    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #666; padding: 2rem;">${emptyMessage}</p>`;
    return;
  }

  const MAX_VISIBLE = 8;
  const hasMore = books.length > MAX_VISIBLE;

  let html = books
    .map((book, index) => {
      const hiddenClass = index >= MAX_VISIBLE ? "hidden" : "";
      return createBookCard(book, "favorite", hiddenClass);
    })
    .join("");

  if (hasMore) {
    html += `
        <div class="show-more-container">
            <button class="btn-show-more" onclick="toggleShowMoreBooks('favorites')">
                Show More Books
            </button>
        </div>
        `;
  }

  container.innerHTML = html;
}

// DISPLAY COMPLETED BOOKS
function displayCompletedBooks(books) {
  const container = document.querySelector(
    ".completed-books .profile-book-grid"
  );

  if (!container) {
    console.error("Container for completed books not found");
    return;
  }

  if (!books || books.length === 0) {
    const emptyMessage = isViewingOwnProfile
      ? "No completed books yet. Finish reading a book to see it here!"
      : `${currentViewingUsername} hasn't completed any books yet.`;

    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #666; padding: 2rem;">${emptyMessage}</p>`;
    return;
  }

  const MAX_VISIBLE = 8;
  const hasMore = books.length > MAX_VISIBLE;

  let html = books
    .map((book, index) => {
      const hiddenClass = index >= MAX_VISIBLE ? "hidden" : "";
      return createBookCard(book, "completed", hiddenClass);
    })
    .join("");

  if (hasMore) {
    html += `
        <div class="show-more-container">
            <button class="btn-show-more" onclick="toggleShowMoreBooks('completed')">
                Show More Books
            </button>
        </div>
        `;
  }

  container.innerHTML = html;
}

// CREATE BOOK CARD
function createBookCard(normalizedbook, type, hiddenClass = "") {
  const bookIsbn = normalizedbook.isbn || "";
  const isbn = escapeHtml(normalizedbook.isbn || "");
  const olid = escapeHtml(normalizedbook.olid || "");
  const workKey = escapeHtml(normalizedbook.workKey || "");
  const title = escapeHtml(normalizedbook.title || "Unknown Title");
  const author = escapeHtml(normalizedbook.author || "Unknown Author");
  const coverUrl =
    normalizedbook.coverUrl ||
    "https://via.placeholder.com/250x350?text=No+Cover";

  let progressInfo = "";

  if (type === "reading") {
    // Check if total page is available
    const totalPages = normalizedbook.totalPages;
    const hasPages = Number.isFinite(totalPages) && totalPages > 0;

    if (!hasPages) {
      const progressUnavailableDisplay = showProgressTracking
        ? "block"
        : "none";
      const completeButtonDisplay = "block";

      progressInfo = `
            <p class="progress-unavailable" style="display: ${progressUnavailableDisplay}">Progress tracking not available</p>
            ${
              isViewingOwnProfile
                ? `<button class="btn-complete-book" data-book-isbn="${bookIsbn}" style="display: ${completeButtonDisplay}">Mark as Complete</button>`
                : ""
            }
        `;
    } else {
      // Show progress tracker
      const currentPage = normalizedbook.currentPage || 0;
      const percentage = Math.round((currentPage / totalPages) * 100);

      if (isViewingOwnProfile) {
        // Full interactive progress tracker for own profile
        const progressTrackerDisplay = showProgressTracking ? "block" : "none";
        const completeButtonDisplay = showProgressTracking ? "none" : "block";

        progressInfo = `
                <div class="progress-tracker" style="display: ${progressTrackerDisplay}">
                    <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${percentage}%"></div> 
                    </div>
                    <p class="progress-text">${percentage}% completed</p>
                    <div class="progress-controls">
                    <input
                        type="number"
                        min="0"
                        max="${totalPages}"
                        value="${currentPage}"
                        data-book-isbn="${bookIsbn}"
                        class="current-page-input"
                        placeholder="Page"
                    />
                    <span class="page-separator">/</span>
                    <span class="total-pages">${totalPages}</span>
                    <button class="update-progress-btn" data-book-isbn="${bookIsbn}">Update</button>
                    </div>
                </div>
                <button class="btn-complete-book" data-book-isbn="${bookIsbn}" style="display: ${completeButtonDisplay}">Mark as Complete</button>
            `;
      } else {
        // Read only progress display for other users
        progressInfo = `
                <div class="progress-tracker">
                    <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${percentage}%"></div> 
                    </div>
                    <p class="progress-text">${percentage}% completed</p>
                </div>
            `;
      }
    }
  } else if (type === "completed") {
    progressInfo = `<p class="completed-badge">Completed</p>`;
  }

  return `
<div class="profile-book-wrapper  ${hiddenClass}">
    <div class="profile-book-card" onclick="viewBookFromCard(this)" data-isbn="${isbn}" data-olid="${olid}" data-workkey="${workKey}">
        <div class="profile-book-card-header">
            <img 
            class="profile-book-card-cover"
            src="${coverUrl}"
            alt="${title} cover"
            onerror="this.src='https://via.placeholder.com/250x350?text=No+Cover'"
            />
            <div class="profile-book-card-info">
                <p class="profile-book-card-title">${title}</p>
                <p class="profile-book-card-author">${author}</p>
            </div>
        </div>
    </div>
    <div class="profile-book-progress">
        ${progressInfo}
    </div>
</div>
`;
}

// TOGGLE SHOW MORE BOOKS
function toggleShowMoreBooks(section) {
  let container;

  if (section === "currently-reading") {
    container = document.querySelector(".currently-reading .profile-book-grid");
  } else if (section === "favorites") {
    container = document.querySelector(".top-books .profile-book-grid");
  } else if (section === "completed") {
    container = document.querySelector(".completed-books .profile-book-grid");
  }

  if (!container) return;

  const hiddenWrappers = container.querySelectorAll(
    ".profile-book-wrapper.hidden"
  );
  const button = container.querySelector(".btn-show-more");

  if (hiddenWrappers.length > 0) {
    hiddenWrappers.forEach((card) => card.classList.remove("hidden"));
    button.textContent = "Show Less";
  } else {
    const allWrappers = container.querySelectorAll(".profile-book-wrapper");
    allWrappers.forEach((card, index) => {
      if (index >= 8) card.classList.add("hidden");
    });
    const remainingHidden = allWrappers.length - 8;
    button.textContent = `Show More Books (${remainingHidden})`;
  }
}

// DISPLAY LECTURE CLUBS
function displayLectureClubs(clubs) {
  const container = document.querySelector(".lecture-clubs .club-grid");

  if (!container) {
    console.error("Container for lecture clubs not found");
    return;
  }

  if (!clubs || clubs.length === 0) {
    const emptyMessage = isViewingOwnProfile
      ? "No lecture clubs joined yet. Join clubs from the Lecture Clubs page!"
      : `${currentViewingUsername} hasn't joined any lecture clubs yet.`;

    container.innerHTML = `
      <p style="grid-column: 1/-1; text-align: center; color: #666; padding: 2rem;">
        ${emptyMessage}
      </p>`;
    return;
  }

  const MAX_VISIBLE = 6;
  const visibleClubs = clubs.slice(0, MAX_VISIBLE);
  const hiddenClubs = clubs.slice(MAX_VISIBLE);

  let html = visibleClubs
    .map(
      (club) => `
        <div class="club-card-small" onclick="viewClub(${club.clubId})">
            <h4>${escapeHtml(club.clubTitle || "Unknown Club")}</h4>
            <span class="club-genre-badge">${escapeHtml(
              club.clubGenre || "General"
            )}</span>
            <p class="club-role">Role: ${escapeHtml(club.role || "Member")}</p>
            <p class="club-joined-date">Joined ${formatDate(club.joinedAt)}</p>
        </div>
        `
    )
    .join("");

  if (hiddenClubs.length > 0) {
    html += `
            <div class="hidden-clubs" style="display: none;">
                ${hiddenClubs
                  .map(
                    (club) => `
                    <div class="club-card-small" onclick="viewClub(${
                      club.clubId
                    })">
                        <h4>${escapeHtml(club.clubTitle || "Unknown Club")}</h4>
                        <span class="club-genre-badge">${escapeHtml(
                          club.clubGenre || "General"
                        )}</span>
                        <p class="club-role">Role: ${escapeHtml(
                          club.role || "Member"
                        )}</p>
                        <p class="club-joined-date">Joined ${formatDate(
                          club.joinedAt
                        )}</p>
                    </div>
                `
                  )
                  .join("")}
            </div>
            <div class="show-more-container" style="grid-column: 1/-1; text-align: center; margin-top: 1rem;">
                <button class="btn-show-more" onclick="toggleShowMoreClubs()">
                    Show More Clubs (${hiddenClubs.length})
                </button>
            </div>
        `;
  }

  container.innerHTML = html;
}

// TOGGLE SHOW MORE CLUBS
function toggleShowMoreClubs() {
  const container = document.querySelector(".lecture-clubs .club-grid");
  if (!container) return;

  const hiddenClubs = container.querySelector(".hidden-clubs");
  const button = container.querySelector(".btn-show-more");

  if (!hiddenClubs || !button) return;

  if (hiddenClubs.style.display === "none") {
    hiddenClubs.style.display = "grid";
    button.textContent = "Show Less";
  } else {
    hiddenClubs.style.display = "none";
    const hiddenCount = hiddenClubs.querySelectorAll(".club-card-small").length;
    button.textContent = `Show More Clubs (${hiddenCount})`;
  }
}

// PROGRESS TRACKING
function attachProgressListeners() {
  // Update buttons
  document.querySelectorAll(".update-progress-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const bookIsbn = btn.dataset.bookIsbn;

      if (!bookIsbn) {
        console.error("No ISBN found for book");
        alert("Error: Book identifier not found");
        return;
      }

      const card = btn.closest(".profile-book-card");

      // Check if it's paged-based or not
      const pageInput = card.querySelector(".current-page-input");
      if (!pageInput) return;

      const newPage = parseInt(pageInput.value);
      if (isNaN(newPage)) {
        alert("Please enter a valid page number.");
        return;
      }

      await updateProgressByPage(bookIsbn, newPage);
    });
  });

  // Enter key on inputs
  document
    .querySelectorAll(".current-page-input, .progress-percentahe-input")
    .forEach((input) => {
      input.addEventListener("keypress", (e) => {
        if (e.key == "Enter") {
          e.preventDefault();
          const btn = input
            .closest(".progress-tracker")
            .querySelector(".update-progress-btn");
          btn.click();
        }
      });

      // Prevent card click when interacting with input
      input.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    });
}
function attachCompleteListeners() {
  document.querySelectorAll(".btn-complete-book").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const bookIsbn = btn.dataset.bookIsbn;

      if (!bookIsbn) {
        console.error("No ISBN found for book");
        alert("Error: Book identifier not found");
        return;
      }

      if (confirm("Mark this book as complete?")) {
        await markBookAsComplete(bookIsbn);
      }
    });
  });
}

async function markBookAsComplete(bookIsbn) {
  try {
    console.log("Marking book as complete:", bookIsbn);

    const response = await fetch(
      `/api/user/currently-reading/${encodeURIComponent(bookIsbn)}/complete`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to mark book as complete");
    }

    alert("Book marked as complete!");
    await loadCurrentlyReading();
    await loadCompletedBooks();
  } catch (error) {
    console.error("Error marking book as complete:", error);
    alert("Error marking book as complete. Please try again.");
  }
}

async function updateProgressByPage(bookIsbn, currentPage) {
  try {
    console.log(
      "Updating progress for book:",
      bookIsbn,
      "to page:",
      currentPage
    );

    const response = await fetch(
      `/api/user/currently-reading/${encodeURIComponent(
        bookIsbn
      )}/progress-by-page`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPage }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to update progress");
    }

    const data = await response.json();

    if (data.completed) {
      alert("Congratulations! You have completed this book!");
      await loadCurrentlyReading();
      await loadCompletedBooks();
    } else {
      await loadCurrentlyReading();
    }
  } catch (error) {
    console.error("Error updating progress:", error);
    alert("Error updating progress. Please try again.");
  }
}

// NAVIGATION
function viewBook(isbn, olid, workKey) {
  if (isbn && isbn !== "") {
    window.location.href = `/book-details.html?isbn=${encodeURIComponent(
      isbn
    )}`;
  } else if (olid && olid !== "") {
    window.location.href = `/book-details.html?olid=${encodeURIComponent(
      olid
    )}`;
  } else if (workKey && workKey !== "") {
    const cleanKey = workKey.startsWith("/") ? workKey.substring(1) : workKey;
    window.location.href = `/book-details.html?workKey=${encodeURIComponent(
      cleanKey
    )}`;
  } else {
    console.error("No valid identifier provided");
    alert("Book information not available");
  }
}

function viewBookFromCard(element) {
  const card = element.closest(".profile-book-card");
  if (!card) return;

  const isbn = card.dataset.isbn;
  const olid = card.dataset.olid;
  const workKey = card.dataset.workkey;

  viewBook(isbn, olid, workKey);
}

function viewClub(clubId) {
  window.location.href = `/lecture-club-page.html?id=${clubId}`;
}

// UTILITIES
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 1) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} year${years === 1 ? "" : "s"} ago`;
  }
}

function normalizeBookData(book) {
  console.log("Book data received:", book);

  let totalPages = book.numberOfPages || book.totalPages || book.numberOfPages;
  console.log("Raw totalPages:", totalPages);

  if (Array.isArray(totalPages)) {
    totalPages = totalPages[0];
    console.log("After array handling:", totalPages);
  }

  if (typeof totalPages === "string") {
    totalPages = totalPages.replace(/[^\d.]/g, "");
  }

  totalPages = parseInt(totalPages);

  if (isNaN(totalPages) || totalPages <= 0) totalPages = null;
  console.log("Final totalPages:", totalPages);

  return {
    id: book.id || book.bookId,
    isbn: book.isbn || "",
    olid: book.olid || "",
    workKey: book.workKey || "",
    title: book.title || "Unknown Title",
    author: book.author || "Unknown Author",
    coverUrl:
      book.coverUrl || "https://via.placeholder.com/250x350?text=No+Cover",
    totalPages,
    currentPage: book.currentPage || 0,
  };
}
function showError(message) {
  const main = document.querySelector("main");
  if (main) {
    main.innerHTML = `
    <div style="text-align: center; padding: 3rem; color: #666;">
    <h2>Oops!</h2>
    <p>${escapeHtml(message)}</p>
    <a href="index.html" style="color: #007bff;">Go back to home</a>
    </div>
`;
  }
}

// START
console.log("My Books page loaded");
initializeMyBooksPage();
