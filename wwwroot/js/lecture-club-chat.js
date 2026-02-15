// ============================================
// LECTURE CLUB CHAT PAGE
// Independent chat for each lecture club
// ============================================

let clubChatConnection = null;
let currentChatUsername = null;
let clubChatId = null;
let typingTimeout = null;

// INITIALIZATION
async function initializeClubChat(clubId) {
  if (!clubId) {
    console.error("No club ID provided for chat");
    return;
  }

  clubChatId = clubId;
  console.log("Initializing chat for club:", clubId);

  // Check authentication
  try {
    const response = await fetch("/api/check-auth", {
      credentials: "include",
    });

    if (!response.ok) {
      console.error("Auth check failed");
      hideChatSection();
      return;
    }

    const authData = await response.json();

    if (!authData.isAuthenticated || !authData.username) {
      console.error("User not authenticated");
      hideChatSection();
      return;
    }

    currentChatUsername = authData.username;

    //Check if user is a member of this club
    const membershipCheck = await checkClubMembership(clubId, authData.userId);

    if (!membershipCheck.isMember) {
      console.log("User is not a member of this club");
      showNonMemberChatMessage();
      return;
    }

    updateChatUsername();

    console.log("Authenticated as:", currentChatUsername, "for club:", clubId);

    // Load chat history for this club
    await loadClubChatHistory();

    // Initialize SignalR connection
    await initializeSignalRForClub();
  } catch (error) {
    console.error("Error initializing club chat:", error);
    hideChatSection();
  }
}

//Check club membership
async function checkClubMembership(clubId, userId) {
  try {
    const response = await fetch(
      `/api/lectureclubs/${clubId}/membership/${userId}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      return { isMember: false };
    }

    const data = await response.json();
    return { isMember: data.isInClub };
  } catch (error) {
    console.error("Error checking membership:", error);
    return { isMember: false };
  }
}

//Show message for non-members
function showNonMemberChatMessage() {
  const chatContainer = document.querySelector(".club-chat-container");
  if (chatContainer) {
    chatContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 2rem; text-align: center; background: #f8fafc; border-radius: 12px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 256 256" fill="#cbd5e1" style="margin-bottom: 1rem;">
          <path d="M216,48H40A16,16,0,0,0,24,64V224a15.85,15.85,0,0,0,9.24,14.5A16.13,16.13,0,0,0,40,240a15.89,15.89,0,0,0,10.25-3.78.69.69,0,0,0,.13-.11L82.5,208H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48ZM40,224h0ZM216,192H82.5a16,16,0,0,0-10.3,3.75l-.12.11L40,224V64H216ZM88,112a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H96A8,8,0,0,1,88,112Zm0,32a8,8,0,0,1,8-8h64a8,8,0,1,1,0,16H96A8,8,0,0,1,88,144Z"></path>
        </svg>
        <h3 style="margin: 0 0 0.5rem 0; color: #475569; font-size: 1.25rem;">Join the Club to Chat</h3>
        <p style="margin: 0; color: #64748b; font-size: 0.95rem;">
          You need to be a member of this club to access the chat
        </p>
      </div>
    `;
  }
}

function hideChatSection() {
  const chatContainer = document.querySelector(".club-chat-container");
  if (chatContainer) {
    chatContainer.style.display = "none";
  }
}

function updateChatUsername() {
  const usernameDisplay = document.getElementById("current-username-display");
  if (usernameDisplay && currentChatUsername) {
    usernameDisplay.textContent = currentChatUsername;
  }
}

// SIGNALR CONNECTION
async function initializeSignalRForClub() {
  try {
    clubChatConnection = new signalR.HubConnectionBuilder()
      .withUrl(`/chatHub?username=${encodeURIComponent(currentChatUsername)}`)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    registerSignalREvents();

    await clubChatConnection.start();
    console.log("Connected to club chat");
    updateConnectionStatus(true);
  } catch (error) {
    console.error("Error connecting to club chat:", error);
    updateConnectionStatus(false);
    setTimeout(() => initializeSignalRForClub(), 5000);
  }
}

function registerSignalREvents() {
  // Receive messages - ONLY for this club
  clubChatConnection.on("ReceiveMessage", (data) => {
    if (data.chatId === clubChatId) {
      appendMessage(
        data.username,
        data.message,
        data.sentAt,
        data.username === currentChatUsername
      );
    }
  });

  // User joined
  clubChatConnection.on("UserConnected", (username) => {
    appendSystemMessage(`${username} joined the chat`);
  });

  // User left
  clubChatConnection.on("UserDisconnected", (username) => {
    appendSystemMessage(`${username} left the chat`);
  });

  // Typing indicator
  clubChatConnection.on("UserIsTyping", (username) => {
    if (username !== currentChatUsername) {
      showTypingIndicator(username);
    }
  });

  clubChatConnection.on("UserStoppedTyping", () => {
    hideTypingIndicator();
  });

  // Connection events
  clubChatConnection.onreconnecting(() => {
    console.log("Reconnecting...");
    updateConnectionStatus(false);
  });

  clubChatConnection.onreconnected(() => {
    console.log("Reconnected");
    updateConnectionStatus(true);
    appendSystemMessage("Reconnected to chat");
  });

  clubChatConnection.onclose(() => {
    console.log("Connection closed");
    updateConnectionStatus(false);
  });
}

// LOAD CHAT HISTORY
async function loadClubChatHistory() {
  try {
    const response = await fetch(
      `/api/chat/history?chatId=${clubChatId}&limit=50`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      console.error("Failed to load chat history:", response.status);
      return;
    }

    const messages = await response.json();
    console.log(`Loaded ${messages.length} messages for club ${clubChatId}`);

    messages.forEach((msg) => {
      appendMessage(
        msg.username,
        msg.message,
        msg.sentAt,
        msg.username === currentChatUsername
      );
    });

    scrollToBottom();
  } catch (error) {
    console.error("Error loading club chat history:", error);
  }
}

// SEND MESSAGE
async function sendClubMessage() {
  const input = document.getElementById("message-input");
  const message = input.value.trim();

  if (!message || !clubChatConnection || !clubChatId) return;

  console.log(`Sending to club ${clubChatId}: "${message}"`);

  try {
    // Send message with club ID
    await clubChatConnection.invoke(
      "SendMessage",
      currentChatUsername,
      message,
      clubChatId // This makes it club-specific
    );

    console.log("Message sent");
    input.value = "";

    await clubChatConnection.invoke("UserStoppedTyping", currentChatUsername);
  } catch (error) {
    console.error("Error sending message:", error);
    alert(`Failed to send message: ${error.message}`);
  }
}

// DISPLAY MESSAGES
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

// TYPING INDICATOR
function showTypingIndicator(username) {
  const indicator = document.getElementById("typing-indicator");
  const text = indicator.querySelector(".typing-text");

  text.textContent = `${username} is typing`;
  indicator.style.display = "flex";
  scrollToBottom();
}

function hideTypingIndicator() {
  const indicator = document.getElementById("typing-indicator");
  indicator.style.display = "none";
}

async function notifyTyping() {
  if (!clubChatConnection) return;

  try {
    await clubChatConnection.invoke("UserTyping", currentChatUsername);
    clearTimeout(typingTimeout);

    typingTimeout = setTimeout(async () => {
      await clubChatConnection.invoke("UserStoppedTyping", currentChatUsername);
    }, 2000);
  } catch (error) {
    console.error("Error notifying typing:", error);
  }
}

// CONNECTION STATUS
function updateConnectionStatus(isConnected) {
  const statusElement = document.getElementById("connection-status");

  if (statusElement) {
    if (isConnected) {
      statusElement.innerHTML =
        '<span class="status-dot connected"></span> Connected';
      statusElement.style.color = "#10b981";
    } else {
      statusElement.innerHTML =
        '<span class="status-dot disconnected"></span> Disconnected';
      statusElement.style.color = "#ef4444";
    }
  }
}

// UTILITIES
function scrollToBottom() {
  const messagesDiv = document.getElementById("chat-messages");
  if (messagesDiv) {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// EVENT LISTENERS
function setupChatEventListeners() {
  const input = document.getElementById("message-input");
  const sendButton = document.getElementById("send-button");

  if (sendButton) {
    sendButton.addEventListener("click", sendClubMessage);
  }

  if (input) {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendClubMessage();
      }
    });

    input.addEventListener("input", () => {
      if (input.value.trim()) {
        notifyTyping();
      }
    });
  }

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    if (clubChatConnection) {
      clubChatConnection.stop();
    }
  });
}

// AUTO-INITIALIZE
// Wait for DOM and club ID to be ready
document.addEventListener("DOMContentLoaded", () => {
  // Setup event listeners first
  setupChatEventListeners();

  // The chat will be initialized when the club page loads
  // and calls initializeClubChat(clubId) from lecture-club-page.js
  console.log("Club chat module ready");
});

// Export for use in lecture-club-page.js
if (typeof window !== "undefined") {
  window.initializeClubChat = initializeClubChat;
}
