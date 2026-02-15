// ============================================
// LECTURE CLUB CREATE PAGE
// Handles creating clubs
// ============================================

let coverImageData = null;
let currentUserId = null;


// INTITIALIZE
document.addEventListener("DOMContentLoaded", async () => {
  await checkAuthentication();
  setupFormListeners();
});


// AUTHENTIFICATION
async function checkAuthentication() {
  try {
    const response = await fetch("/api/check-auth", {
      credentials: "include",
    });

    if (!response.ok) {
      showToast("Please log in to create a club", "error");
      // Store current page for redirect after login
      sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
      setTimeout(() => {
        window.location.href = "/user-login.html";
      }, 2000);
      return;
    }

    const authData = await response.json();

    if (!authData.isAuthenticated || !authData.userId) {
      showToast("Please log in to create a club", "error");
      // Store current page for redirect after login
      sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
      setTimeout(() => {
        window.location.href = "/user-login.html";
      }, 2000);
      return;
    }

    currentUserId = authData.userId;
    console.log("Authenticated as user:", currentUserId);
  } catch (error) {
    console.error("Auth check error:", error);
    showToast("Authentication error", "error");
  }
}


// SETUP FOR EVENT LISTENERS
function setupFormListeners() {
  const form = document.getElementById("createClubForm");
  const titleInput = document.getElementById("clubTitle");
  const descInput = document.getElementById("clubDescription");

  // Character counters
  titleInput.addEventListener("input", () => {
    document.getElementById("titleCount").textContent = titleInput.value.length;
  });

  descInput.addEventListener("input", () => {
    document.getElementById("descCount").textContent = descInput.value.length;
  });

  // Form submission
  form.addEventListener("submit", handleFormSubmit);
}


// SUBMISSION
async function handleFormSubmit(e) {
  e.preventDefault();

  if (!currentUserId) {
    showError("User not authenticated");
    return;
  }

  const title = document.getElementById("clubTitle").value.trim();
  const genre = document.getElementById("clubGenre").value.trim();
  const description = document.getElementById("clubDescription").value.trim();

  // Validation
  if (!title) {
    showError("Please enter a club name");
    return;
  }

  if (!genre) {
    showError("Please enter a genre");
    return;
  }

  // Disable submit button
  const createButton = document.getElementById("createButton");
  createButton.disabled = true;
  createButton.textContent = "Creating...";

  try {
    const requestData = {
      title: title,
      genre: genre,
      description: description || "",
      coverImage: coverImageData,
      createdByUserId: currentUserId,
    };

    console.log("Creating club with data:", requestData);

    const response = await fetch("/api/lectureclubs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(requestData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to create club");
    }

    if (data.success && data.club) {
      showToast(`${data.club.title} created successfully!`, "success");

      // Redirect to the new club page after a short delay
      setTimeout(() => {
        window.location.href = `/lecture-club-page.html?id=${data.club.id}`;
      }, 1500);
    } else {
      throw new Error("Unexpected response format");
    }
  } catch (error) {
    console.error("Error creating club:", error);
    showError(error.message || "Failed to create club");

    // Re-enable button
    createButton.disabled = false;
    createButton.textContent = "Create Club";
  }
}


// CLUB'S DETAILS
// Image upload
function handleImageUpload(event) {
  const file = event.target.files[0];

  if (!file) return;

  // Validate file type
  if (!file.type.match("image/png") && !file.type.match("image/jpeg")) {
    showToast("Please upload a PNG or JPG image", "error");
    return;
  }

  // Validate file size (2MB)
  if (file.size > 2 * 1024 * 1024) {
    showToast("Image size must be less than 2MB", "error");
    return;
  }

  // Read and display image
  const reader = new FileReader();

  reader.onload = function (e) {
    coverImageData = e.target.result;

    const preview = document.getElementById("coverPreview");
    const uploadSection = document.getElementById("coverUploadSection");

    preview.src = coverImageData;
    preview.classList.add("show");
    uploadSection.classList.add("has-image");

    // Hide upload text when image is shown
    uploadSection.querySelector(".upload-icon").style.display = "none";
    uploadSection.querySelector(".upload-text").style.display = "none";
    uploadSection.querySelector(".upload-subtext").style.display = "none";
  };

  reader.onerror = function () {
    showToast("Failed to read image file", "error");
  };

  reader.readAsDataURL(file);
}

// Select genre from suggestions
function selectGenre(genre) {
  document.getElementById("clubGenre").value = genre;
}

// UTILITIES
// Show error message
function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.textContent = message;
  errorDiv.classList.add("show");

  setTimeout(() => {
    errorDiv.classList.remove("show");
  }, 5000);
}

// Show toast notification
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// Go back to previous page
function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = "/lecture-club.html";
  }
}
