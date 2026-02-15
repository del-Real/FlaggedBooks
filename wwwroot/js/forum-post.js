// ============================================
// FORUM POST DETAIL PAGE
// Handles displaying post, replies, and spoiler protection
// ============================================

let currentBookIdentifier = null;
let currentPostId = null;
let currentPost = null;
let replies = [];


// INITIALIZATION
function initializePostPage() {
  const params = new URLSearchParams(window.location.search);
  currentBookIdentifier = params.get("book");
  currentPostId = params.get("postId");

  console.log(
    "Loading post:",
    currentPostId,
    "for book:",
    currentBookIdentifier
  );

  if (!currentBookIdentifier || !currentPostId) {
    showError("Post not found");
    return;
  }

  loadPost();
  loadReplies();
  initializeButtons();
  initializeSpoilerTool();
}


// LOAD POST DATA
function loadPost() {
  try {
    // Load from localStorage (in production, this would be an API call)
    const storageKey = `forum_posts_${currentBookIdentifier}`;
    const storedPosts = localStorage.getItem(storageKey);

    if (!storedPosts) {
      showError("Post not found");
      return;
    }

    const posts = JSON.parse(storedPosts);
    currentPost = posts.find((p) => p.id.toString() === currentPostId);

    if (!currentPost) {
      showError("Post not found");
      return;
    }

    displayPost(currentPost);
  } catch (error) {
    console.error("Error loading post:", error);
    showError("Error loading post");
  }
}

function displayPost(post) {
  const titleEl = document.getElementById("post-title");
  const authorEl = document.getElementById("post-author");
  const dateEl = document.getElementById("post-date");
  const contentEl = document.getElementById("post-content");

  if (titleEl) titleEl.textContent = post.title;
  if (authorEl) authorEl.textContent = `Posted by ${post.author}`;
  if (dateEl) dateEl.textContent = formatDate(post.createdAt);
  if (contentEl) contentEl.innerHTML = processSpoilers(post.content || "");
}


// LOAD REPLIES
function loadReplies() {
  try {
    // Load from localStorage (in production, this would be an API call)
    const storageKey = `forum_replies_${currentBookIdentifier}_${currentPostId}`;
    const storedReplies = localStorage.getItem(storageKey);

    if (storedReplies) {
      replies = JSON.parse(storedReplies);
    } else {
      replies = [];
    }

    displayReplies(replies);
  } catch (error) {
    console.error("Error loading replies:", error);
    replies = [];
    displayReplies([]);
  }
}

function displayReplies(replyList) {
  const container = document.getElementById("replies-list");
  const countEl = document.getElementById("replies-count");

  if (countEl) {
    countEl.textContent = `(${replyList.length})`;
  }

  if (!container) return;

  if (replyList.length === 0) {
    container.innerHTML = `
      <p style="text-align: center; color: #666; padding: 2rem;">
        No replies yet. Be the first to reply!
      </p>
    `;
    return;
  }

  container.innerHTML = replyList
    .map(
      (reply) => `
    <div class="reply-card">
      <div class="reply-header">
        <span class="reply-author">${escapeHtml(reply.author)}</span>
        <span class="reply-date">${formatDate(reply.createdAt)}</span>
      </div>
      <div class="reply-content">
        ${processSpoilers(reply.content)}
      </div>
    </div>
  `
    )
    .join("");
}


// SPOILER FUNCTIONALITY
function initializeSpoilerTool() {
  const btnMarkSpoiler = document.getElementById("btn-mark-spoiler");
  const replyTextarea = document.getElementById("reply-content");

  if (btnMarkSpoiler && replyTextarea) {
    btnMarkSpoiler.addEventListener("click", () => {
      markSelectedTextAsSpoiler(replyTextarea);
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

function processSpoilers(text) {
  if (!text) return "";

  // Convert [spoiler]text[/spoiler] to HTML with spoiler class
  const spoilerRegex = /\[spoiler\](.*?)\[\/spoiler\]/g;

  return escapeHtml(text).replace(
    spoilerRegex,
    '<span class="spoiler" onclick="revealSpoiler(this)">$1</span>'
  );
}

// Global function to reveal spoilers (called from onclick)
window.revealSpoiler = function (element) {
  element.classList.add("revealed");
};


// POST REPLY
async function submitReply() {
  const contentTextarea = document.getElementById("reply-content");
  const submitBtn = document.getElementById("btn-submit-reply");

  if (!contentTextarea) return;

  const content = contentTextarea.value.trim();

  if (!content) {
    showNotification("Please enter a reply", "error");
    return;
  }

  // Disable button while submitting
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Posting...";
  }

  try {
    // In production, this would POST to the API
    // const response = await fetch(`/api/books/${currentBookIdentifier}/posts/${currentPostId}/replies`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ content })
    // });

    const newReply = {
      id: Date.now(),
      content: content,
      author: "You",
      createdAt: new Date().toISOString(),
    };

    replies.push(newReply);

    // Save to localStorage
    const storageKey = `forum_replies_${currentBookIdentifier}_${currentPostId}`;
    localStorage.setItem(storageKey, JSON.stringify(replies));

    // Update message count in the main post
    updatePostMessageCount();

    displayReplies(replies);
    contentTextarea.value = "";
    showNotification("Reply posted successfully!", "success");
  } catch (error) {
    console.error("Error posting reply:", error);
    showNotification("Error posting reply. Please try again.", "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Post Reply";
    }
  }
}

function updatePostMessageCount() {
  try {
    const storageKey = `forum_posts_${currentBookIdentifier}`;
    const storedPosts = localStorage.getItem(storageKey);

    if (!storedPosts) return;

    const posts = JSON.parse(storedPosts);
    const postIndex = posts.findIndex((p) => p.id.toString() === currentPostId);

    if (postIndex !== -1) {
      posts[postIndex].messageCount = replies.length + 1; // +1 for original post
      localStorage.setItem(storageKey, JSON.stringify(posts));
    }
  } catch (error) {
    console.error("Error updating message count:", error);
  }
}


// NAVIGATION
function initializeButtons() {
  const btnBack = document.getElementById("btn-back");
  const btnSubmitReply = document.getElementById("btn-submit-reply");

  if (btnBack) {
    btnBack.addEventListener("click", () => {
      // Get the book identifier from URL to navigate back properly
      const params = new URLSearchParams(window.location.search);
      const book = params.get("book");

      // Try to extract the type of identifier
      let backUrl = "book-details.html";

      if (book) {
        if (book.startsWith("OL") && book.endsWith("M")) {
          backUrl += `?olid=${book}`;
        } else if (
          book.includes("works/") ||
          (book.startsWith("OL") && book.endsWith("W"))
        ) {
          backUrl += `?workKey=${book}`;
        } else {
          backUrl += `?isbn=${book}`;
        }
      }

      window.location.href = backUrl;
    });
  }

  if (btnSubmitReply) {
    btnSubmitReply.addEventListener("click", submitReply);
  }
}


// UTILITIES
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

function showError(message) {
  const container = document.querySelector(".forum-post-container");
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <h2>Error</h2>
        <p>${escapeHtml(message)}</p>
        <a href="index.html" style="color: #007bff;">Go back to home</a>
      </div>
    `;
  }
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

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

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}


// INITIALIZE ON LOAD
console.log("Forum post page loaded");
initializePostPage();
