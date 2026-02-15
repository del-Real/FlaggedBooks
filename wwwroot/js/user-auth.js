// ============================================
// USER LOGIN AND REGISTRATION PAGE
// Verify if the user has logged in. If not, log in function.
// If the user does not have account, resgister function.
// ============================================


// CHECK IF ALREADY LOG IN
window.addEventListener("DOMContentLoaded", () => {
  fetch("/api/check-auth")
    .then((response) => response.json())
    .then((data) => {
      console.log("Auth check:", data);

      if (data.isAuthenticated) {
        // Already logged in, skip login page
        console.log("Already logged in. Redirecting...");

        // Check if there's a redirect URL stored
        const redirectTo =
          sessionStorage.getItem("redirectAfterLogin") || "user-profile.html";
        sessionStorage.removeItem("redirectAfterLogin"); // Clean up
        window.location.href = redirectTo;
      }
    })
    .catch((error) => {
      console.error("Auth check error:", error);
    });
});


// LOGIN FUNCTIONALITY
function evaluateLogin() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const invalidText = document.querySelector(".invalid-login");
  const btnPrimary = document.querySelector(".btn-primary");

  // Input fields
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  // Reset styles
  usernameInput.style.outline = "";
  passwordInput.style.outline = "";
  invalidText.style.display = "none";

  if (!username || !password) {
    invalidText.textContent = "Please fill in all fields.";
    invalidText.style.display = "flex";
    invalidText.style.alignItems = "center";
    invalidText.style.color = "#ff0000ff";

    if (!username) usernameInput.style.border = "2px solid #ff0000ff";
    if (!password) passwordInput.style.border = "2px solid #ff0000ff";
    return;
  }

  btnPrimary.disabled = true;

  // Send POST request to backend API
  fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Server response:", data);

      if (data.success) {
        invalidText.style.display = "none";
        usernameInput.style.outline = "";
        passwordInput.style.outline = "";

        invalidText.textContent = "Successful login";
        invalidText.style.display = "flex";
        invalidText.style.alignItems = "center";
        invalidText.style.color = "#4BB543";

        // Get redirect URL or default to index.html
        const redirectTo =
          sessionStorage.getItem("redirectAfterLogin") || "index.html";
        sessionStorage.removeItem("redirectAfterLogin"); // Clean up

        // Redirection
        setTimeout(() => {
          window.location.href = redirectTo;
        }, 1000);
      } else {
        invalidText.textContent = data.message || "User or password incorrect.";
        invalidText.style.display = "flex";
        invalidText.style.alignItems = "center";
        invalidText.style.color = "#ff0000ff";
        usernameInput.style.border = "2px solid #ff0000ff";
        passwordInput.style.border = "2px solid #ff0000ff";

        // Reactivate button
        btnPrimary.disabled = false;
      }
    })
    .catch((error) => {
      console.error("Login error:", error);

      invalidText.textContent = "Connection error. Try again.";
      invalidText.style.display = "flex";
      invalidText.style.alignItems = "center";
      invalidText.style.color = "#ff0000ff";

      // Reload button
      btnPrimary.disabled = false;
    });
}

// REGISTER FUNCIONALITY
function evaluateRegister() {
  const email = document.getElementById("email").value;
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const repeatPassword = document.getElementById("repeatPassword").value;

  const invalidText = document.querySelector(".invalid-login");
  const registerButton = document.querySelector(".btn-primary");

  // Input fields
  const emailInput = document.getElementById("email");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const repeatPasswordInput = document.getElementById("repeatPassword");

  // Reset styles
  emailInput.style.outline = "";
  usernameInput.style.outline = "";
  passwordInput.style.outline = "";
  repeatPasswordInput.style.outline = "";
  invalidText.style.display = "none";

  // 1 - Check if all fields are filled
  if (!email || !username || !password || !repeatPassword) {
    invalidText.textContent = "Please fill in all fields.";
    invalidText.style.display = "flex";
    invalidText.style.alignItems = "center";
    invalidText.style.color = "#ff0000ff";

    if (!email) emailInput.style.outline = "2px solid #ff0000ff";
    if (!username) usernameInput.style.outline = "2px solid #ff0000ff";
    if (!password) passwordInput.style.outline = "2px solid #ff0000ff";
    if (!repeatPassword)
      repeatPasswordInput.style.outline = "2px solid #ff0000ff";

    return;
  }

  // 2 - Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    invalidText.textContent = "Please enter a valid email address.";
    invalidText.style.display = "flex";
    invalidText.style.alignItems = "center";
    invalidText.style.color = "#ff0000ff";
    emailInput.style.outline = "2px solid #ff0000ff";
    return;
  }

  // 3 - Validate username length (minimum 3 characters)
  if (username.length < 3) {
    invalidText.textContent = "Username must be at least 3 characters long.";
    invalidText.style.display = "flex";
    invalidText.style.alignItems = "center";
    invalidText.style.color = "#ff0000ff";
    usernameInput.style.outline = "2px solid #ff0000ff";
    return;
  }

  // 4 - Validate password length (minimum 5 characters)
  if (password.length < 5) {
    invalidText.textContent = "Password must be at least 5 characters long.";
    invalidText.style.display = "flex";
    invalidText.style.alignItems = "center";
    invalidText.style.color = "#ff0000ff";
    passwordInput.style.outline = "2px solid #ff0000ff";
    return;
  }

  // 5 - Validate passwords match
  if (password !== repeatPassword) {
    invalidText.textContent = "Passwords do not match.";
    invalidText.style.display = "flex";
    invalidText.style.alignItems = "center";
    invalidText.style.color = "#ff0000ff";
    passwordInput.style.outline = "2px solid #ff0000ff";
    repeatPasswordInput.style.outline = "2px solid #ff0000ff";
    return;
  }

  registerButton.disabled = true;
  registerButton.textContent = "Registering...";

  // Send POST request to backend API
  fetch("/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, username, password, repeatPassword }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Server response:", data);

      if (data.success) {
        invalidText.style.color = "#5eff00ff";
        invalidText.textContent = "Registration successful! Redirecting...";
        invalidText.style.display = "flex";
        invalidText.style.alignItems = "center";
        registerButton.textContent = "Registered!";

        setTimeout(() => {
          window.location.href = "index.html"; // redirect to main page
        }, 1500);
      } else {
        invalidText.textContent =
          data.message || "Registration failed. Try again.";
        invalidText.style.display = "flex";
        invalidText.style.alignItems = "center";
        invalidText.style.color = "#ff0000ff";

        if (data.message && data.message.includes("username")) {
          usernameInput.style.outline = "2px solid #ff0000ff";
        }
        if (data.message && data.message.includes("email")) {
          emailInput.style.outline = "2px solid #ff0000ff";
        }
        registerButton.disabled = false;
        registerButton.textContent = "Register";
      }
    })
    .catch((error) => {
      console.error("Register error:", error);

      invalidText.textContent = "Connection error. Try again.";
      invalidText.style.display = "flex";
      invalidText.style.alignItems = "center";
      invalidText.style.color = "#ff0000ff";

      registerButton.disabled = false;
      registerButton.textContent = "Register";
    });
}

// ALLOW ENTER KEY INPUT FOR BOTH LOGIN AND REGISTER
document.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    // Check which page we're on by looking for specific elements
    if (document.getElementById("email")) {
      // We're on the register page
      evaluateRegister();
    } else {
      // We're on the login page
      evaluateLogin();
    }
  }
});
