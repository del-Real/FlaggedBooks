let connection = null;
let currentUsername = null;
let typingTimeout = null;
let onlineUsers = new Set();
// CHANGE THIS WHEN CLUBS ARE IMPLEMENTED
let currentChatId = null; // null = for general chat

document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication with server session
  try {
    const response = await fetch("/api/check-auth", {
      credentials: "include", // Include session cookie
    });

    if (!response.ok) {
      console.error("Auth check failed");
      alert("You must be logged in to access the chat.");
      window.location.href = "user-login.html";
      return;
    }

    const authData = await response.json();
    console.log("Auth check:", authData);

    if (!authData.isAuthenticated || !authData.username) {
      alert("You must be logged in to access the chat.");
      window.location.href = "user-login.html";
      return;
    }

    // User is authenticated
    currentUsername = authData.username;
    document.getElementById("current-username").textContent = currentUsername;

    console.log("✓ Authenticated as:", currentUsername);

    // Initialize chat
    await loadChatHistory();
    await initializeSignalR();
    setupEventListeners();
  } catch (error) {
    console.error("Error checking authentication:", error);
    alert("Connection error. Please try again.");
    window.location.href = "user-login.html";
  }
});

async function initializeSignalR() {
  try {
    connection = new signalR.HubConnectionBuilder()
      .withUrl(`/chatHub?username=${encodeURIComponent(currentUsername)}`)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    registerSignalREvents();

    await connection.start();
    console.log("Connected to chat");
    updateConnectionStatus(true);
  } catch (error) {
    console.error("Error connecting to chat:", error);
    updateConnectionStatus(false);
    setTimeout(() => initializeSignalR(), 5000);
  }
}

function registerSignalREvents() {
  connection.on("ReceiveMessage", (data) => {
    if (data.chatId === currentChatId) {
      appendMessage(
        data.username,
        data.message,
        data.sentAt,
        data.username === currentUsername
      );
    }
  });

  connection.on("UserConnected", (username) => {
    appendSystemMessage(`${username} joined the chat`);
    onlineUsers.add(username);
    updateOnlineUsers();
  });

  connection.on("UserDisconnected", (username) => {
    appendSystemMessage(`${username} left the chat`);
    onlineUsers.delete(username);
    updateOnlineUsers();
  });

  connection.on("UserIsTyping", (username) => {
    showTypingIndicator(username);
  });

  connection.on("UserStoppedTyping", (username) => {
    hideTypingIndicator();
  });

  connection.onreconnecting(() => {
    console.log("Reconnecting...");
    updateConnectionStatus(false);
  });

  connection.onreconnected(() => {
    console.log("Reconnected");
    updateConnectionStatus(true);
    appendSystemMessage("Reconnected to chat");
  });

  connection.onclose(() => {
    console.log("Connection closed");
    updateConnectionStatus(false);
  });
}

async function loadChatHistory() {
  try {
    // Reload history for the current chat
    const url = currentChatId
      ? `/api/chat/history?chatId=${currentChatId}&limit=50`
      : `/api/chat/history?limit=50`;

    const response = await fetch(url, {
      credentials: "include", // Include session cookie
    });

    if (!response.ok) {
      console.error("Failed to load chat history:", response.status);
      return;
    }

    const messages = await response.json();

    messages.forEach((msg) => {
      appendMessage(
        msg.username,
        msg.message,
        msg.sentAt,
        msg.username === currentUsername
      );
    });

    scrollToBottom();
  } catch (error) {
    console.error("Error loading chat history:", error);
  }
}

async function sendMessage() {
  const input = document.getElementById("message-input");
  const message = input.value.trim();

  if (!message || !connection) return;

  console.log(`Sending to chat ${currentChatId ?? "general"}: "${message}"`);

  try {
    // CLUB
    await connection.invoke(
      "SendMessage",
      currentUsername,
      message,
      currentChatId
    );

    console.log("Message sent");
    input.value = "";

    await connection.invoke("UserStoppedTyping", currentUsername);
  } catch (error) {
    console.error("Error sending message:", error);
    alert(`Failed to send message: ${error.message}`);
  }
}

function appendMessage(username, message, time, isOwn) {
  const messagesDiv = document.getElementById("chat-messages");

  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isOwn ? "own" : "other"}`;

  messageDiv.innerHTML = `
    <div class="message-header">
      <span class="message-username">${escapeHtml(username)}</span>
      <span class="message-time">${time}</span>
    </div>
    <div class="message-content">${escapeHtml(message)}</div>
  `;

  messagesDiv.appendChild(messageDiv);
  scrollToBottom();
}

function appendSystemMessage(message) {
  const messagesDiv = document.getElementById("chat-messages");

  const systemDiv = document.createElement("div");
  systemDiv.className = "system-message";
  systemDiv.textContent = message;

  messagesDiv.appendChild(systemDiv);
  scrollToBottom();
}

function showTypingIndicator(username) {
  const indicator = document.getElementById("typing-indicator");
  const text = indicator.querySelector(".typing-text");

  text.textContent = `${username} is typing`;
  indicator.style.display = "block";
}

function hideTypingIndicator() {
  const indicator = document.getElementById("typing-indicator");
  indicator.style.display = "none";
}

async function notifyTyping() {
  if (!connection) return;

  try {
    await connection.invoke("UserTyping", currentUsername);
    clearTimeout(typingTimeout);

    typingTimeout = setTimeout(async () => {
      await connection.invoke("UserStoppedTyping", currentUsername);
    }, 2000);
  } catch (error) {
    console.error("Error notifying typing:", error);
  }
}

function updateConnectionStatus(isConnected) {
  const statusElement = document.getElementById("connection-status");

  if (isConnected) {
    statusElement.innerHTML =
      '<span class="status-dot connected"></span> Connected';
  } else {
    statusElement.innerHTML =
      '<span class="status-dot disconnected"></span> Disconnected';
  }
}

function updateOnlineUsers() {
  const usersList = document.getElementById("users-list");
  usersList.innerHTML = "";

  const currentUserLi = document.createElement("li");
  currentUserLi.textContent = `${currentUsername} (you)`;
  currentUserLi.style.fontWeight = "bold";
  usersList.appendChild(currentUserLi);

  onlineUsers.forEach((username) => {
    if (username !== currentUsername) {
      const li = document.createElement("li");
      li.textContent = username;
      usersList.appendChild(li);
    }
  });
}

function scrollToBottom() {
  const messagesDiv = document.getElementById("chat-messages");
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function setupEventListeners() {
  const input = document.getElementById("message-input");
  const sendButton = document.getElementById("send-button");

  sendButton.addEventListener("click", sendMessage);

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener("input", () => {
    if (input.value.trim()) {
      notifyTyping();
    }
  });

  window.addEventListener("beforeunload", () => {
    if (connection) {
      connection.stop();
    }
  });
}

// FOR CHANGING CLUB
function switchChat(chatId) {
  currentChatId = chatId;

  // Clean messages
  const messagesDiv = document.getElementById("chat-messages");
  messagesDiv.innerHTML = "";

  // Reload history chat
  loadChatHistory();

  console.log(`Switched to chat ${chatId ?? "general"}`);
}
