// ============================================
// BOOK DETAILS PAGE
// Show all the book's information from the API.
// If logged in, add book to currently reading and / or favourites.
// Forum book with spoiler function
// ============================================

const bookTitle = document.getElementById("book-title");
const bookCover = document.getElementById("book-cover");
const bookAuthor = document.getElementById("book-author");
const bookDescription = document.getElementById("book-description");
const bookPublisher = document.getElementById("book-publisher");
const bookDate = document.getElementById("book-date");
const bookLanguage = document.getElementById("book-language");
const bookLength = document.getElementById("book-length");
const bookISBN10 = document.getElementById("book-isbn10");
const bookISBN13 = document.getElementById("book-isbn13");
const bookOpenLibraryID = document.getElementById("book-openlibrary-id");
const bookWorkID = document.getElementById("book-work-id");

// Store current book data
let currentBookData = null;
let currentBookISBN = null;

// Get button references
const btnCurrentlyReading = document.querySelector(
  ".btn-book-details:nth-of-type(1)"
);
const btnFavorite = document.querySelector(".btn-book-details:nth-of-type(2)");

// Store current book status
let currentBookStatus = {
  isReading: false,
  isFavorite: false,
};

// BUTTON APPEARANCE
function updateButtonAppearance() {
  // Update Currently Reading button
  if (btnCurrentlyReading) {
    if (currentBookStatus.isReading) {
      btnCurrentlyReading.textContent = "✓ Added to Reading";
      btnCurrentlyReading.classList.add("success");
      btnCurrentlyReading.title = "Click to remove from Currently Reading";
    } else {
      btnCurrentlyReading.textContent = "Currently Reading it";
      btnCurrentlyReading.classList.remove("success");
      btnCurrentlyReading.title = "Click to add to Currently Reading";
    }
    btnCurrentlyReading.disabled = !currentBookISBN;
  }

  // Update Favorite button
  if (btnFavorite) {
    if (currentBookStatus.isFavorite) {
      btnFavorite.textContent = "✓ Added to Favorites";
      btnFavorite.classList.add("success");
      btnFavorite.title = "Click to remove from Favorites";
    } else {
      btnFavorite.textContent = "One of my Favourites";
      btnFavorite.classList.remove("success");
      btnFavorite.title = "Click to add to Favorites";
    }
    btnFavorite.disabled = !currentBookISBN;
  }
}

// DISPLAY BOOK
function displayBookData(data, sourceType, sourceId) {
  bookTitle.textContent = data.title || "Unknown Title";
  bookAuthor.textContent = Array.isArray(data.authors)
    ? data.authors.join(", ")
    : data.authors || "Unknown Author";
  bookCover.src =
    data.coverUrl || "https://via.placeholder.com/250x350?text=No+Cover";
  bookDescription.textContent = data.description || "No description available";

  // Secondary details
  if (bookPublisher) {
    bookPublisher.textContent = data.publishers
      ? Array.isArray(data.publishers)
        ? data.publishers.join(", ")
        : data.publishers
      : "N/A";
  }

  if (bookDate) {
    bookDate.textContent = data.publishDate || "N/A";
  }

  if (bookLength) {
    bookLength.textContent = data.numberOfPages
      ? `${data.numberOfPages} pages`
      : "N/A";
  }

  const bookRatingElement = document.getElementById("book-rating");
  const bookVotesElement = document.getElementById("book-votes");

  if (data.ratings_average !== undefined && data.ratings_count !== undefined) {
    const ratingInfo = getRatingInfo(data.ratings_average, data.ratings_count);

    if (bookRatingElement) {
      bookRatingElement.textContent = ratingInfo.text;
      bookRatingElement.style.color = ratingInfo.color;
      bookRatingElement.style.fontWeight = "600";
    }

    if (bookVotesElement) {
      if (data.ratings_count > 0) {
        bookVotesElement.textContent = `(${data.ratings_count} votes)`;
        bookVotesElement.style.display = "inline";
      } else {
        bookVotesElement.textContent = "";
        bookVotesElement.style.display = "none";
      }
    }
  } else {
    const ratingInfo = getRatingInfo(0, 0);

    if (bookRatingElement) {
      bookRatingElement.textContent = ratingInfo.text;
      bookRatingElement.style.color = ratingInfo.color;
      bookRatingElement.style.fontWeight = "normal";
    }

    if (bookVotesElement) {
      bookVotesElement.textContent = "";
      bookVotesElement.style.display = "none";
    }
  }

  // Extract and store ISBN based on source type
  if (sourceType === "isbn") {
    currentBookISBN = sourceId;
    if (bookISBN10) bookISBN10.textContent = "N/A";
    if (bookISBN13) bookISBN13.textContent = sourceId;
    if (bookOpenLibraryID) bookOpenLibraryID.textContent = "N/A";
    if (bookWorkID) bookWorkID.textContent = "N/A";
  } else if (sourceType === "olid") {
    currentBookISBN = data.isbn || null;
    if (bookISBN10) bookISBN10.textContent = "N/A";
    if (bookISBN13) bookISBN13.textContent = data.isbn || "N/A";
    if (bookOpenLibraryID) bookOpenLibraryID.textContent = sourceId;
    if (bookWorkID) bookWorkID.textContent = "N/A";
  } else if (sourceType === "workKey") {
    currentBookISBN = data.isbn13 || data.isbn10 || null;
    if (bookISBN10) bookISBN10.textContent = data.isbn10 || "N/A";
    if (bookISBN13) bookISBN13.textContent = data.isbn13 || "N/A";
    if (bookOpenLibraryID)
      bookOpenLibraryID.textContent = data.editionKey || "N/A";
    if (bookWorkID)
      bookWorkID.textContent = sourceId.replace(/^(\/)?works\//, "");
  }

  // Store book data for later use
  currentBookData = data;

  // Enable/disable buttons based on ISBN availability
  updateButtonStates();

  // Check book status after loading details
  checkBookStatus();
}

// UPDATE BUTTONS
function updateButtonStates() {
  if (!currentBookISBN) {
    if (btnCurrentlyReading) {
      btnCurrentlyReading.disabled = true;
      btnCurrentlyReading.title = "ISBN not available for this book";
    }
    if (btnFavorite) {
      btnFavorite.disabled = true;
      btnFavorite.title = "ISBN not available for this book";
    }
  } else {
    if (btnCurrentlyReading) {
      btnCurrentlyReading.disabled = false;
      btnCurrentlyReading.title = "";
    }
    if (btnFavorite) {
      btnFavorite.disabled = false;
      btnFavorite.title = "";
    }
  }
}

async function checkBookStatus() {
  if (!currentBookISBN) {
    console.warn("No ISBN available to check status");
    return;
  }

  try {
    const response = await fetch(
      `/api/user/book-status?isbn=${currentBookISBN}`
    );

    if (!response.ok) {
      // If not logged in or other error, assume book is not added
      currentBookStatus = { isReading: false, isFavorite: false };
      updateButtonAppearance();
      return;
    }

    const status = await response.json();
    currentBookStatus = status;
    updateButtonAppearance();
  } catch (error) {
    console.error("Error checking book status:", error);
    currentBookStatus = { isReading: false, isFavorite: false };
    updateButtonAppearance();
  }
}

async function toggleCurrentlyReading() {
  if (!currentBookISBN) {
    showNotification("Cannot add this book: ISBN not available", "error");
    return;
  }

  // Disable button while processing
  if (btnCurrentlyReading) {
    btnCurrentlyReading.disabled = true;
    btnCurrentlyReading.textContent = currentBookStatus.isReading
      ? "Removing..."
      : "Adding...";
  }

  try {
    const response = await fetch("/api/user/currently-reading/by-isbn", {
      method: currentBookStatus.isReading ? "DELETE" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isbn: currentBookISBN }),
    });

    // Parse response - now it should always be JSON
    let result;
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      // If not JSON, treat as error
      throw new Error("Server returned non-JSON response");
    }

    if (response.ok && result.success) {
      // Toggle the status
      currentBookStatus.isReading = !currentBookStatus.isReading;

      const action = currentBookStatus.isReading ? "added to" : "removed from";
      showNotification(`Book ${action} Currently Reading!`, "success");

      updateButtonAppearance();
    } else {
      // Handle specific error cases
      if (response.status === 401) {
        showNotification("Please log in to manage books", "error");
        setTimeout(() => {
          window.location.href = "/user-login.html";
        }, 500);
      } else {
        showNotification(result.message || "Failed to modify book", "error");
      }

      updateButtonAppearance();
    }
  } catch (error) {
    console.error("Error toggling to currently reading:", error);
    showNotification("Error modifying book. Please try again.", "error");
    updateButtonAppearance();
  }
}

async function toggleFavorite() {
  if (!currentBookISBN) {
    showNotification("Cannot add this book: ISBN not available", "error");
    return;
  }

  // Disable button while processing
  if (btnFavorite) {
    btnFavorite.disabled = true;
    btnFavorite.textContent = currentBookStatus.isFavorite
      ? "Removing..."
      : "Adding...";
  }

  try {
    const response = await fetch("/api/user/favorites/by-isbn", {
      method: currentBookStatus.isFavorite ? "DELETE" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isbn: currentBookISBN }),
    });

    // Parse response - now it should always be JSON
    let result;
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      // If not JSON, treat as error
      throw new Error("Server returned non-JSON response");
    }

    if (response.ok && result.success) {
      // Toggle the status
      currentBookStatus.isFavorite = !currentBookStatus.isFavorite;

      const action = currentBookStatus.isFavorite ? "added to" : "removed from";
      showNotification(`Book ${action} Favorites!`, "success");

      updateButtonAppearance();
    } else {
      // Handle specific error cases
      if (response.status === 401) {
        showNotification("Please log in to manage books", "error");
        setTimeout(() => {
          window.location.href = "/user-login.html";
        }, 500);
      } else {
        showNotification(result.message || "Failed to modify book", "error");
      }

      updateButtonAppearance();
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    showNotification("Error modifying book. Please try again.", "error");
    updateButtonAppearance();
  }
}

// FETCH BOOK
// By ISBN
async function fetchBookByISBN() {
  const params = new URLSearchParams(window.location.search);
  const isbn = params.get("isbn");

  console.log("Fetching book with ISBN:", isbn);

  try {
    const response = await fetch(`/api/books/isbn/${isbn}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("External book data (ISBN):", data);

    displayBookData(data, "isbn", isbn);
  } catch (error) {
    console.error("Error fetching book by ISBN:", error);
    showError("Error loading book details.");
  }
}

// By OLID
async function fetchBookByOLID() {
  const params = new URLSearchParams(window.location.search);
  const olid = params.get("olid");

  console.log("Fetching book with OLID:", olid);

  try {
    const response = await fetch(`/api/books/olid/${olid}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("External book data (OLID):", data);

    displayBookData(data, "olid", olid);
  } catch (error) {
    console.error("Error fetching book by OLID:", error);
    showError("Error loading book details.");
  }
}

// By WorkKey
async function fetchBookByWorkKey() {
  const params = new URLSearchParams(window.location.search);
  const workKey = params.get("workKey");

  console.log("Fetching book with WorkKey:", workKey);

  try {
    const response = await fetch(`/api/books/work/${workKey}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("External book data (WorkKey):", data);

    displayBookData(data, "workKey", workKey);
  } catch (error) {
    console.error("Error fetching book by WorkKey:", error);
    showError("Error loading book details.");
  }
}

// LOAD BOOK DETAILS
function loadBookDetails() {
  const params = new URLSearchParams(window.location.search);
  const isbn = params.get("isbn");
  const olid = params.get("olid");
  const workKey = params.get("workKey");

  console.log("URL params - isbn:", isbn, "olid:", olid, "workKey:", workKey);

  if (isbn) {
    fetchBookByISBN();
  } else if (olid) {
    fetchBookByOLID();
  } else if (workKey) {
    fetchBookByWorkKey();
  } else {
    showError("No book identifier provided");
  }
}

// Initialize button event listeners
function initializeButtons() {
  if (btnCurrentlyReading) {
    btnCurrentlyReading.addEventListener("click", toggleCurrentlyReading);
  }

  if (btnFavorite) {
    btnFavorite.addEventListener("click", toggleFavorite);
  }
}

// UTILITIES
// Show Error
function showError(message) {
  if (bookTitle) bookTitle.textContent = "Error";
  if (bookDescription) bookDescription.textContent = message;
}

// Show Notification
function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  // Add styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
    font-weight: 500;
    max-width: 300px;
  `;

  if (type === "success") {
    notification.style.backgroundColor = "#10b981";
    notification.style.color = "white";
  } else if (type === "error") {
    notification.style.backgroundColor = "#ef4444";
    notification.style.color = "white";
  } else {
    notification.style.backgroundColor = "#3b82f6";
    notification.style.color = "white";
  }

  // Add animation keyframes
  if (!document.getElementById("notification-styles")) {
    const style = document.createElement("style");
    style.id = "notification-styles";
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Escape HTML utility function
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Get rating information
function getRatingInfo(rating, ratingsCount = 0) {
  if (!rating || rating === 0 || ratingsCount === 0) {
    return {
      text: "Not enough reviews",
      color: "#999999",
      class: "rating-none",
    };
  }

  if (rating > 4.0) {
    return {
      text: "Highly Recommended",
      color: "#10b981", // Green
      class: "rating-excellent",
    };
  }

  if (rating > 2.5) {
    return {
      text: "Recommended",
      color: "#f59e0b", // Yellow
      class: "rating-good",
    };
  }

  if (rating > 1.5) {
    return {
      text: "Unfavorable",
      color: "#f97316", // Orange
      class: "rating-poor",
    };
  }

  return {
    text: "Very Unfavorable",
    color: "#ef4444", // Red
    class: "rating-bad",
  };
}

// START
loadBookDetails();
initializeButtons();

// FORUM FUNCTIONALITY
let currentBookIdentifier = null;
let forumPosts = [];

// initialize forum
function initializeForum() {
  const params = new URLSearchParams(window.location.search);
  const isbn = params.get("isbn");
  const olid = params.get("olid");
  const workKey = params.get("workKey");

  currentBookIdentifier = isbn || olid || workKey;

  console.log("Initializing forum for book:", currentBookIdentifier);

  if (currentBookIdentifier) {
    loadForumPosts();
  }

  // Set up modal handlers
  const btnCreatePost = document.getElementById("btn-create-post");
  const modal = document.getElementById("create-post-modal");
  const modalClose = document.getElementById("modal-close");
  const btnCancel = document.getElementById("btn-cancel");
  const btnSubmit = document.getElementById("btn-submit-post");

  if (btnCreatePost) {
    btnCreatePost.addEventListener("click", () => {
      modal.style.display = "flex";
    });
  }

  if (modalClose) {
    modalClose.addEventListener("click", closeModal);
  }

  if (btnCancel) {
    btnCancel.addEventListener("click", closeModal);
  }

  if (btnSubmit) {
    btnSubmit.addEventListener("click", submitPost);
  }

  // Close modal when clicking outside
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // Initialize spoiler tool for create post modal
  initializeSpoilerToolForModal();
}

// Load forum posts for current book
async function loadForumPosts() {
  try {
    // In production, this would fetch from your API:
    // const response = await fetch(`/api/books/${currentBookIdentifier}/forum`);
    // const posts = await response.json();

    // For now, load book-specific mock data from localStorage
    const storageKey = `forum_posts_${currentBookIdentifier}`;
    const storedPosts = localStorage.getItem(storageKey);

    if (storedPosts) {
      forumPosts = JSON.parse(storedPosts);
    } else {
      // Initialize with empty array for new books
      forumPosts = [];
      localStorage.setItem(storageKey, JSON.stringify(forumPosts));
    }

    displayForumPosts(forumPosts);
  } catch (error) {
    console.error("Error loading forum posts:", error);
    displayForumPosts([]);
  }
}

// Display forum posts
function displayForumPosts(posts) {
  const container = document.getElementById("forum-posts");

  if (!container) {
    console.error("Forum posts container not found");
    return;
  }

  if (!posts || posts.length === 0) {
    container.innerHTML = `
      <p style="text-align: center; color: #666; padding: 2rem;">
        No forum posts yet. Be the first to start a discussion!
      </p>
    `;
    return;
  }

  container.innerHTML = posts
    .map(
      (post) => `
    <div class="forum-post" onclick="viewForumPost(${post.id})">
      <h3 class="forum-post-title">${escapeHtml(post.title)}</h3>
      <p class="forum-post-meta">${post.messageCount} messages</p>
    </div>
  `
    )
    .join("");
}

// View individual forum post
function viewForumPost(postId) {
  // Navigate to forum post detail page
  window.location.href = `forum-post.html?book=${encodeURIComponent(
    currentBookIdentifier
  )}&postId=${postId}`;
}

// Close modal
function closeModal() {
  const modal = document.getElementById("create-post-modal");
  if (modal) {
    modal.style.display = "none";
    // Clear form
    const titleInput = document.getElementById("post-title");
    const contentInput = document.getElementById("post-content");
    if (titleInput) titleInput.value = "";
    if (contentInput) contentInput.value = "";
  }
}

// Submit new post
async function submitPost() {
  const titleInput = document.getElementById("post-title");
  const contentInput = document.getElementById("post-content");

  if (!titleInput || !contentInput) return;

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!title) {
    showNotification("Please enter a post title", "error");
    return;
  }

  if (!content) {
    showNotification("Please enter post content", "error");
    return;
  }

  try {
    // In production, this would POST to: `/api/books/${currentBookIdentifier}/forum`
    // const response = await fetch(`/api/books/${currentBookIdentifier}/forum`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ title, content })
    // });
    // const result = await response.json();

    // For now, save to book-specific localStorage
    const newPost = {
      id: Date.now(), // Use timestamp as unique ID
      title: title,
      content: content,
      messageCount: 1, // Initial post counts as 1 message
      author: "You",
      createdAt: new Date().toISOString().split("T")[0],
    };

    forumPosts.unshift(newPost);

    // Save to book-specific storage
    const storageKey = `forum_posts_${currentBookIdentifier}`;
    localStorage.setItem(storageKey, JSON.stringify(forumPosts));

    displayForumPosts(forumPosts);

    showNotification("Post created successfully!", "success");
    closeModal();
  } catch (error) {
    console.error("Error creating post:", error);
    showNotification("Error creating post. Please try again.", "error");
  }
}

// Initialize forum when page loads
setTimeout(() => {
  initializeForum();
}, 500);

// SPOILER FUNCTIONALITY
function initializeSpoilerToolForModal() {
  const btnMarkSpoiler = document.getElementById("btn-mark-spoiler-modal");
  const postContentTextarea = document.getElementById("post-content");

  if (btnMarkSpoiler && postContentTextarea) {
    btnMarkSpoiler.addEventListener("click", () => {
      markSelectedTextAsSpoiler(postContentTextarea);
    });
  }
}

function markSelectedTextAsSpoiler(textarea) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);

  if (!selectedText) {
    showNotification("Please select text to mark as spoiler", "error");
    return;
  }

  // Wrap selected text with spoiler tags
  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(end);
  const newText = `${before}[spoiler]${selectedText}[/spoiler]${after}`;

  textarea.value = newText;

  // Move cursor after the spoiler tag
  const newCursorPos =
    start + selectedText.length + "[spoiler][/spoiler]".length;
  textarea.setSelectionRange(newCursorPos, newCursorPos);
  textarea.focus();

  showNotification("Text marked as spoiler!", "success");
}
