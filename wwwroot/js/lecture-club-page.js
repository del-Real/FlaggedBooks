// ============================================
// LECTURE CLUB PAGE
// Shows the club's details
// ============================================

const clubTitle = document.getElementById("club-title");
const clubGenre = document.getElementById("club-genre");
const clubGenreInfo = document.getElementById("club-genre-info");
const clubCreated = document.getElementById("club-created");
const clubCreatedDate = document.getElementById("club-created-date");
const clubDescription = document.getElementById("club-description");
const clubUsers = document.getElementById("club-users");
const clubId = document.getElementById("club-id");
const btnJoin = document.getElementById("btn-join");
const btnLeave = document.getElementById("btn-leave");

let currentClubId = null;
let pendingInvitationId = null;
let currentUserId = null;
let isUserInClub = false;
let currentInvitationId = null;
let currentVotingSession = null;
let userHasProposed = false;
let userProposalId = null;
let userVoteProposalId = null;

// GET CURRENT USER ID
async function getCurrentUserId() {
  try {
    const response = await fetch("/api/auth/current-user");
    if (!response.ok) {
      console.error("Not authenticated");
      window.location.href = "/user-login.html";
      return null;
    }

    const userData = await response.json();
    console.log("Current user:", userData);
    return userData.userId;
  } catch (error) {
    console.error("Error getting current user:", error);
    window.location.href = "/user-login.html";
    return null;
  }
}

// INITIALIZE PAGE
async function initializePage() {
  currentUserId = await getCurrentUserId();

  if (!currentUserId) {
    showError("Please log in to access this club");
    return;
  }

  console.log("Initialized with userId:", currentUserId);
  await fetchClubDetails();
  await loadVotingSession();
  await updateVotingControls();
}

// FETCH CLUB DETAILS
async function fetchClubDetails() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  currentClubId = id;

  if (!id) {
    showError("No club ID provided");
    return;
  }

  try {
    const response = await fetch(`/api/lectureclubs/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Lecture club data:", data);

    displayClubData(data);

    if (data.currentBook) {
      displayBookOfTheMonth(data.currentBook);
    }

    checkUserInClub(id);
    checkPendingInvitations(id);

    // Fetch and display club members
    await fetchClubMembers(id);

    await fetchReadingList(id);

    // Initialize chat for the club
    if (typeof initializeClubChat === "function") {
      console.log("Initializing chat for club:", parseInt(id));
      initializeClubChat(parseInt(id));
    } else {
      console.error("initializeClubChat function not found");
    }
  } catch (error) {
    console.error("Error fetching lecture club:", error);
    showError("Error loading lecture club details.");
  }
}

// DISPLAY CLUB DATA
function displayClubData(data) {
  clubTitle.textContent = data.title || "Unknown Club";
  clubDescription.textContent = data.description || "No description available";

  if (clubGenre) clubGenre.textContent = data.genre || "Unknown";
  if (clubGenreInfo) clubGenreInfo.textContent = data.genre || "Unknown";

  const createdDate = new Date(data.createdAt);
  const formattedDate = createdDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (clubCreated) clubCreated.textContent = formattedDate;
  if (clubCreatedDate) clubCreatedDate.textContent = formattedDate;

  if (clubUsers) clubUsers.textContent = data.userCount || "0";
  if (clubId) clubId.textContent = data.id;

  // Display cover image if available
  const clubCover = document.getElementById("club-cover");
  if (clubCover && data.coverImage) {
    clubCover.style.backgroundImage = `url('${data.coverImage}')`;
    clubCover.style.backgroundSize = "cover";
    clubCover.style.backgroundPosition = "center";
  }

  // Display creator info if available
  const clubCreator = document.getElementById("club-creator");
  if (clubCreator && data.createdBy) {
    clubCreator.textContent = `Created by ${data.createdBy.username}`;
  }
}

// FETCH AND DISPLAY CLUB MEMBERS
// Fetch Club Members
async function fetchClubMembers(clubId) {
  try {
    const response = await fetch(`/api/lectureclubs/${clubId}/users`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const members = await response.json();
    console.log("Club members:", members);

    displayClubMembers(members);
  } catch (error) {
    console.error("Error fetching club members:", error);
    const membersGrid = document.getElementById("members-grid");
    if (membersGrid) {
      membersGrid.innerHTML =
        '<div class="members-loading">Unable to load members</div>';
    }
  }
}

// Display Club Members
function displayClubMembers(members) {
  const membersGrid = document.getElementById("members-grid");

  if (!membersGrid) {
    console.error("Members grid element not found");
    return;
  }

  if (!members || members.length === 0) {
    membersGrid.innerHTML = '<div class="members-loading">No members yet</div>';
    return;
  }

  membersGrid.innerHTML = "";

  members.forEach((member, index) => {
    const memberBubble = createMemberBubble(member, index);
    membersGrid.appendChild(memberBubble);
  });
}

// CREATE MEMBER BUBBLE ELEMENT
function createMemberBubble(member, index) {
  const bubble = document.createElement("div");
  bubble.className = "member-bubble";
  bubble.title = `${member.username} - ${member.role}${
    member.bookTitle ? "\nReading: " + member.bookTitle : ""
  }`;

  // Create avatar with first letter of username
  const avatar = document.createElement("div");
  const colorClass = `color-${(index % 6) + 1}`;
  avatar.className = `member-avatar ${colorClass}`;
  avatar.textContent = member.username.charAt(0).toUpperCase();

  // Create info container
  const info = document.createElement("div");
  info.className = "member-info";

  // Username
  const username = document.createElement("div");
  username.className = "member-username";
  username.textContent = member.username;

  // Role badge
  const role = document.createElement("div");
  role.className = `member-role ${member.role.toLowerCase()}`;
  role.textContent = member.role;

  info.appendChild(username);
  info.appendChild(role);

  // Book info (if available)
  if (member.bookTitle) {
    const book = document.createElement("div");
    book.className = "member-book";
    book.textContent = `📖 ${member.bookTitle}`;
    info.appendChild(book);
  }

  bubble.appendChild(avatar);
  bubble.appendChild(info);

  // Add click handler to show more info
  bubble.addEventListener("click", () => {
    if (member.userId) {
      window.location.href = `/my-books.html?user=${member.userId}`;
    } else {
      showToast("User information not available", "error");
    }
  });

  return bubble;
}

// SHOW MEMBER DETAILS
function showMemberDetails(member) {
  const joinDate = new Date(member.joinedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const details = `${member.username}\nRole: ${member.role}\n${
    member.bookTitle ? "Reading: " + member.bookTitle + "\n" : ""
  }Joined: ${joinDate}`;

  showToast(details, "info");
}

// CHECK PENDING INVITATIONS
async function checkPendingInvitations(clubId) {
  if (!currentUserId) return;

  try {
    const response = await fetch(
      `/api/lectureclubs/${clubId}/invitations/${currentUserId}`
    );
    const invitations = await response.json();

    if (invitations && invitations.length > 0) {
      const invitation = invitations[0];
      pendingInvitationId = invitation.id;

      document.getElementById(
        "invitation-text"
      ).textContent = `${invitation.invitedBy} has invited you to join "${invitation.clubTitle}"`;

      document.getElementById("invitations-section").style.display = "block";

      // Hide join button if pending invitation exists
      btnJoin.style.display = "none";
    }
  } catch (error) {
    console.error("Error checking invitations:", error);
  }
}

// ACCEPT INVITATION
async function acceptInvitation() {
  if (!pendingInvitationId) return;

  try {
    const response = await fetch(
      `/api/lectureclubs/invitations/${pendingInvitationId}/accept`,
      { method: "POST" }
    );

    const data = await response.json();

    if (response.ok) {
      showToast(data.message, "success");
      document.getElementById("invitations-section").style.display = "none";
      btnJoin.style.display = "block";
      fetchClubDetails(); // Refresh
    } else {
      showToast(data.error || "Failed to accept invitation", "error");
    }
  } catch (error) {
    console.error("Error accepting invitation:", error);
    showToast("Error accepting invitation", "error");
  }
}

// REJECT INVITATION
async function rejectInvitation() {
  if (!pendingInvitationId) return;

  try {
    const response = await fetch(
      `/api/lectureclubs/invitations/${pendingInvitationId}/reject`,
      { method: "POST" }
    );

    const data = await response.json();

    if (response.ok) {
      showToast(data.message, "info");
      document.getElementById("invitations-section").style.display = "none";
      btnJoin.style.display = "block";
    } else {
      showToast(data.error || "Failed to reject invitation", "error");
    }
  } catch (error) {
    console.error("Error rejecting invitation:", error);
    showToast("Error rejecting invitation", "error");
  }
}

// CHECK USER IN CLUB
async function checkUserInClub(clubId) {
  if (!currentUserId) {
    console.log("No user ID available");
    return;
  }

  try {
    const response = await fetch(
      `/api/lectureclubs/${clubId}/membership/${currentUserId}`
    );
    const data = await response.json();

    isUserInClub = data.isInClub;

    console.log("User status in club:", data);

    const btnJoin = document.getElementById("btn-join");
    const btnLeave = document.getElementById("btn-leave");
    const btnInvite = document.getElementById("btn-invite");

    if (!btnJoin || !btnLeave) {
      console.error("Buttons not found");
      return;
    }

    if (data.isInClub) {
      // user is member
      btnJoin.textContent = "Already in Club";
      btnJoin.disabled = true;
      btnJoin.classList.add("disabled");
      btnJoin.style.display = "inline-block";

      btnLeave.style.display = "inline-block";

      // show inviting button
      if (btnInvite) {
        btnInvite.style.display = "inline-block";
      }
      await updateVotingControls();
    } else {
      //no member
      btnJoin.textContent = "Join Club";
      btnJoin.disabled = false;
      btnJoin.classList.remove("disabled");
      btnJoin.style.display = "inline-block";

      btnLeave.style.display = "none";

      //hides button for inviting
      if (btnInvite) {
        btnInvite.style.display = "none";
      }
      hideVotingControls();
      console.log("User is not a member of this club");
    }

    return data.isInClub;
  } catch (error) {
    console.error("Error checking user status:", error);
    isUserInClub = false;
    return false;
  }
}

// JOIN CLUB
async function joinClub() {
  if (!currentClubId || !currentUserId) return;

  btnJoin.disabled = true;
  btnJoin.textContent = "Joining...";

  try {
    const response = await fetch(`/api/lectureclubs/${currentClubId}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: currentUserId }),
    });

    const data = await response.json();

    if (response.ok) {
      btnJoin.textContent = "Joined!";
      btnJoin.classList.add("disabled");

      showToast("Successfully joined the club!", "success");

      //Reinitialize chat after joining
      if (typeof initializeClubChat === "function") {
        initializeClubChat(parseInt(currentClubId));
      }

      fetchClubDetails();
    } else {
      btnJoin.disabled = false;
      btnJoin.textContent = "Join Club";
      showToast(data.error || "Failed to join club", "error");
    }
  } catch (error) {
    console.error("Error joining club:", error);
    btnJoin.disabled = false;
    btnJoin.textContent = "Join Club";
    showToast("Error joining club. Please try again.", "error");
  }
}

// LEAVE CLUB
async function leaveClub() {
  if (!currentClubId || !currentUserId) return;

  const confirmResult = await showCustomConfirm(
    "Leave Club",
    "Are you sure you want to leave this club?"
  );

  if (!confirmResult) {
    return;
  }

  btnLeave.disabled = true;
  btnLeave.textContent = "Leaving...";

  try {
    const response = await fetch(`/api/lectureclubs/${currentClubId}/leave`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: currentUserId }),
    });

    const data = await response.json();
    if (response.ok) {
      showToast("You have left the club.", "success");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      btnLeave.disabled = false;
      btnLeave.textContent = "Leave Club";
      showToast(data.error || "Failed to leave club", "error");
    }
  } catch (error) {
    console.error("Error leaving club:", error);
    btnLeave.disabled = false;
    btnLeave.textContent = "Leave Club";
    showToast("Error leaving club. Please try again.", "error");
  }
}

function showCustomConfirm(title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-dialog-overlay show";
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <div class="confirm-dialog-header">
          <h3>${title}</h3>
        </div>
        <div class="confirm-dialog-body">
          <p>${message}</p>
        </div>
        <div class="confirm-dialog-footer">
          <button class="btn-dialog-cancel">Cancel</button>
          <button class="btn-dialog-confirm">Leave Club</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector(".btn-dialog-cancel").onclick = () => {
      overlay.remove();
      resolve(false);
    };

    overlay.querySelector(".btn-dialog-confirm").onclick = () => {
      overlay.remove();
      resolve(true);
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    };
  });
}

// GENERATE INVITATION CODE
async function generateInvitationCode() {
  if (!currentClubId || !currentUserId) {
    showToast("Missing club or user information", "error");
    return;
  }

  if (!isUserInClub) {
    showToast("You must be a member to generate invitation codes", "error");
    return;
  }

  const btnCode = document.getElementById("btn-code");
  if (!btnCode) return;

  btnCode.disabled = true;
  btnCode.textContent = "Generating...";

  try {
    const response = await fetch(
      `/api/lectureclubs/${currentClubId}/generate-code`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invitedByUserId: currentUserId }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      showInvitationCodeModal(data.invitationCode, data.clubTitle);
    } else {
      showToast(data.error || "Failed to generate code", "error");
    }
  } catch (error) {
    console.error("Error generating code:", error);
    showToast("Error generating code. Please try again.", "error");
  } finally {
    btnCode.disabled = false;
    btnCode.textContent = "Get Invitation Code";
  }
}

// INVITE MODAL
function showInviteModal() {
  if (!currentUserId || !isUserInClub) {
    showToast("You must be a member to invite others", "error");
    return;
  }

  const modal = document.getElementById("invite-modal");
  if (modal) {
    modal.style.display = "flex";

    // Clear previous input and message
    const emailInput = document.getElementById("invite-email");
    const messageDiv = document.getElementById("invite-message");

    if (emailInput) emailInput.value = "";
    if (messageDiv) messageDiv.textContent = "";
  }
}

function closeInviteModal() {
  const modal = document.getElementById("invite-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

// Close modal when clicking outside
window.onclick = function (event) {
  const modal = document.getElementById("invite-modal");
  if (event.target === modal) {
    closeInviteModal();
  }
};

// INVITE USER
async function inviteUser(event) {
  event.preventDefault();

  const emailInput = document.getElementById("invite-email");
  const messageDiv = document.getElementById("invite-message");
  const email = emailInput.value.trim();

  if (!email) {
    messageDiv.textContent = "Please enter an email";
    messageDiv.className = "invite-message error";
    return;
  }

  if (!currentClubId || !currentUserId) {
    messageDiv.textContent = "Missing club or user information";
    messageDiv.className = "invite-message error";
    return;
  }

  messageDiv.textContent = "Sending invitation...";
  messageDiv.className = "invite-message info";

  try {
    const response = await fetch(`/api/lectureclubs/${currentClubId}/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        invitedByUserId: currentUserId,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      messageDiv.textContent = `${data.message}`;
      messageDiv.className = "invite-message success";

      // Show invitation code
      if (data.invitationCode) {
        messageDiv.innerHTML = `
          <p>✓ ${data.message}</p>
          <div style="margin-top: 1rem; padding: 1rem; background: #f0f9ff; border-radius: 8px;">
            <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #0369a1;">Invitation Code:</p>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <code style="font-size: 1.2rem; font-weight: 700; color: #1e293b; letter-spacing: 0.1rem;">${data.invitationCode}</code>
              <button 
                onclick="copyCodeToClipboard('${data.invitationCode}')" 
                style="background: #0369a1; color: white; border: none; padding: 0.5rem; border-radius: 4px; cursor: pointer;"
                title="Copy code"
              >
              </button>
            </div>
            <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: #64748b;">
              Share this code with ${data.invitation.invitedUser}
            </p>
          </div>
        `;
      }

      showToast("Invitation sent successfully!", "success");

      // Clear email input
      emailInput.value = "";

      // Close modal after 5 seconds
      setTimeout(() => {
        closeInviteModal();
      }, 5000);
    } else {
      messageDiv.textContent = `${data.error || "Failed to send invitation"}`;
      messageDiv.className = "invite-message error";
      showToast(data.error || "Failed to send invitation", "error");
    }
  } catch (error) {
    console.error("Error sending invitation:", error);
    messageDiv.textContent = "✗ Error sending invitation. Please try again.";
    messageDiv.className = "invite-message error";
    showToast("Error sending invitation", "error");
  }
}

// COPY CODE TO CLIPBOARD
async function copyCodeToClipboard(code) {
  try {
    await navigator.clipboard.writeText(code);
    showToast("Code copied to clipboard!", "success");
  } catch (error) {
    console.error("Failed to copy:", error);

    // Fallback method
    const textArea = document.createElement("textarea");
    textArea.value = code;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand("copy");
      showToast("Code copied to clipboard!", "success");
    } catch (err) {
      showToast("Failed to copy code", "error");
    }

    document.body.removeChild(textArea);
  }
}

// BOOK VOTING SYSTEM
async function loadBookProposals() {
  if (!currentClubId) return;

  try {
    const response = await fetch(
      `/api/lectureclubs/${currentClubId}/books/proposals`
    );

    if (!response.ok) {
      throw new Error("Failed to load book proposals");
    }

    const proposals = await response.json();
    displayBookProposals(proposals);
  } catch (error) {
    console.error("Error loading book proposals:", error);
  }
}

function displayBookProposals(proposals) {
  const container = document.getElementById("book-proposals-grid");

  if (!container) return;

  if (!proposals || proposals.length === 0) {
    container.innerHTML = `
      <div class="no-proposals">
        <p>No books proposed yet. Be the first to suggest a book!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = proposals
    .map(
      (proposal) => `
    <div class="book-proposal-card" data-proposal-id="${proposal.id}">
      <div class="book-proposal-cover">
        <img 
          src="${escapeHtml(
            proposal.coverUrl ||
              "https://via.placeholder.com/150x225?text=No+Cover"
          )}" 
          alt="${escapeHtml(proposal.title)}" 
          onerror="this.src='https://via.placeholder.com/150x225?text=No+Cover'"
        />
      </div>
      <div class="book-proposal-info">
        <h4 class="book-proposal-title">${escapeHtml(proposal.title)}</h4>
        <p class="book-proposal-author">${escapeHtml(
          proposal.author || "Unknown Author"
        )}</p>
        <p class="book-proposal-by">Proposed by ${escapeHtml(
          proposal.proposedBy
        )}</p>
        <div class="book-proposal-votes">
          <span class="vote-count" id="vote-count-${proposal.id}">
            ${proposal.voteCount} ${proposal.voteCount === 1 ? "vote" : "votes"}
          </span>
          <button 
            class="btn-vote" 
            id="vote-btn-${proposal.id}"
            onclick="toggleVote(${proposal.id})"
          >
            <span class="vote-text">Vote</span>
          </button>
        </div>
      </div>
    </div>
  `
    )
    .join("");

  // Check which proposals user has voted for
  proposals.forEach((proposal) => {
    checkUserVote(proposal.id);
  });
}

async function checkUserVote(proposalId) {
  if (!currentUserId) return;

  try {
    const response = await fetch(
      `/api/lectureclubs/books/proposals/${proposalId}/user/${currentUserId}/voted`
    );

    const data = await response.json();

    const voteBtn = document.getElementById(`vote-btn-${proposalId}`);
    if (voteBtn) {
      if (data.hasVoted) {
        voteBtn.classList.add("voted");
        voteBtn.querySelector(".vote-text").textContent = "Voted";
      } else {
        voteBtn.classList.remove("voted");
        voteBtn.querySelector(".vote-text").textContent = "Vote";
      }
    }
  } catch (error) {
    console.error("Error checking vote:", error);
  }
}

async function toggleVote(proposalId) {
  if (!currentUserId || !isUserInClub) {
    showToast("You must be a member to vote", "error");
    return;
  }

  const voteBtn = document.getElementById(`vote-btn-${proposalId}`);
  const isVoted = voteBtn.classList.contains("voted");

  try {
    let response;
    if (isVoted) {
      // Remove vote
      response = await fetch(
        `/api/lectureclubs/books/proposals/${proposalId}/vote?userId=${currentUserId}`,
        { method: "DELETE" }
      );
    } else {
      // Add vote
      response = await fetch(
        `/api/lectureclubs/books/proposals/${proposalId}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUserId }),
        }
      );
    }

    const data = await response.json();

    if (response.ok) {
      // Update UI
      const voteCountEl = document.getElementById(`vote-count-${proposalId}`);
      if (voteCountEl) {
        voteCountEl.textContent = `${data.voteCount} ${
          data.voteCount === 1 ? "vote" : "votes"
        }`;
      }

      if (isVoted) {
        voteBtn.classList.remove("voted");
        voteBtn.querySelector(".vote-text").textContent = "Vote";
      } else {
        voteBtn.classList.add("voted");
        voteBtn.querySelector(".vote-text").textContent = "Voted";
      }

      showToast(data.message, "success");
    } else {
      showToast(data.error || "Failed to update vote", "error");
    }
  } catch (error) {
    console.error("Error toggling vote:", error);
    showToast("Error updating vote. Please try again.", "error");
  }
}

// PROPOSE BOOK MODAL
function showProposeBookModal() {
  if (!isUserInClub) {
    showToast("You must be a member to propose books", "error");
    return;
  }
  document.getElementById("propose-book-modal").style.display = "flex";
}

function closeProposeBookModal() {
  document.getElementById("propose-book-modal").style.display = "none";
  document.getElementById("propose-isbn").value = "";
  document.getElementById("propose-title").value = "";
  document.getElementById("propose-author").value = "";
  document.getElementById("propose-message").textContent = "";
}

async function proposeBook(event) {
  event.preventDefault();

  if (!currentUserId || !isUserInClub) {
    showToast("You must be a member to propose books", "error");
    return;
  }

  const isbn = document.getElementById("propose-isbn").value;
  const title = document.getElementById("propose-title").value;
  const author = document.getElementById("propose-author").value;
  const messageEl = document.getElementById("propose-message");

  messageEl.textContent = "Proposing book...";
  messageEl.style.color = "#64748b";

  try {
    const response = await fetch(
      `/api/lectureclubs/${currentClubId}/books/propose`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUserId,
          isbn: isbn,
          title: title,
          author: author,
          coverUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`,
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      messageEl.textContent = data.message;
      messageEl.style.color = "#10b981";

      setTimeout(() => {
        closeProposeBookModal();
        loadBookProposals();
      }, 1500);
    } else {
      messageEl.textContent = data.error || "Failed to propose book";
      messageEl.style.color = "#ef4444";
    }
  } catch (error) {
    console.error("Error proposing book:", error);
    messageEl.textContent = "Error proposing book. Please try again.";
    messageEl.style.color = "#ef4444";
  }
}

// LOAD VOTING SESSION
async function loadVotingSession() {
  if (!currentClubId) return;

  try {
    const url = currentUserId
      ? `/api/lectureclubs/${currentClubId}/voting/active?userId=${currentUserId}`
      : `/api/lectureclubs/${currentClubId}/voting/active`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.active) {
      currentVotingSession = data.session;
      userProposalId = data.userProposalId;
      userVoteProposalId = data.userVoteProposalId;
      userHasProposed = !!userProposalId;

      displayVotingSection(data);
    } else {
      hideVotingSection();
    }
  } catch (error) {
    console.error("Error loading voting session:", error);
  }
}

// SHOW/HIDE VOTING SECTION
function displayVotingSection(data) {
  const votingSection = document.getElementById("book-voting-section");
  if (!votingSection) return;

  votingSection.style.display = "block";

  const votingHeader = votingSection.querySelector(".voting-header");
  const proposalsGrid = document.getElementById("book-proposals-grid");

  if (!votingHeader || !proposalsGrid) return;

  if (data.session.status === "Proposing") {
    votingHeader.innerHTML = `
      <div>
        <h2 class="voting-title"> ${escapeHtml(data.session.title)}</h2>
        <p class="voting-phase">Phase 1: Proposing Books</p>
        <p class="voting-description">
          ${data.proposals.length} book${
      data.proposals.length !== 1 ? "s" : ""
    } proposed so far
        </p>
      </div>
      <button
        class="btn-primary btn-propose"
        onclick="showProposeFromFavoritesModal()"
        ${userHasProposed ? 'style="background: #10b981;"' : ""}
      >
        ${userHasProposed ? "Change Your Proposal" : "Propose a Book"}
      </button>
    `;
  } else if (data.session.status === "Voting") {
    const totalVotes = data.proposals.reduce((sum, p) => sum + p.voteCount, 0);

    votingHeader.innerHTML = `
      <div>
        <h2 class="voting-title"> ${escapeHtml(data.session.title)}</h2>
        <p class="voting-phase">Phase 2: Voting</p>
        <p class="voting-description">
          ${data.proposals.length} book${
      data.proposals.length !== 1 ? "s" : ""
    } to choose from • 
          ${totalVotes} vote${totalVotes !== 1 ? "s" : ""} cast
        </p>
      </div>
    `;
  }

  displayProposals(data.proposals, data.session.status);
}

function hideVotingSection() {
  const votingSection = document.getElementById("book-voting-section");
  if (votingSection) {
    votingSection.style.display = "none";
  }
}

// SHOW PROPOSALS
function displayProposals(proposals, sessionStatus) {
  const container = document.getElementById("book-proposals-grid");
  if (!container) return;

  if (!proposals || proposals.length === 0) {
    if (sessionStatus === "Proposing") {
      container.innerHTML = `
        <div class="no-proposals">
          <p>No books proposed yet!</p>
          <p style="font-size: 0.9rem; color: #64748b; margin-top: 0.5rem;">
            Be the first to suggest a book from your favorites
          </p>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="no-proposals">
          <p>No proposals available</p>
        </div>
      `;
    }
    return;
  }

  container.innerHTML = proposals
    .map((proposal) => {
      const isUserProposal = proposal.id === userProposalId;
      const isUserVote = proposal.id === userVoteProposalId;
      const canVote = sessionStatus === "Voting";
      const isWinner = proposal.status === "Winner";

      let cardClass = "book-proposal-card";
      if (isUserVote && canVote) cardClass += " user-voted";
      if (isWinner) cardClass += " winner-card";

      let badge = "";
      if (isUserProposal && sessionStatus === "Proposing") {
        badge = '<div class="your-proposal-badge">Your Proposal</div>';
      } else if (isUserVote && canVote) {
        badge = '<div class="your-vote-badge">✓ Your Vote</div>';
      } else if (isWinner) {
        badge = '<div class="winner-badge">Winner!</div>';
      }

      return `
    <div class="${cardClass}" 
        ${canVote ? `onclick="voteForProposal(${proposal.id})"` : ""}
        style="${!canVote ? "cursor: default;" : ""}">
      ${badge}
      <div class="book-proposal-cover">
        <img 
          src="${escapeHtml(
            proposal.coverUrl ||
              "https://via.placeholder.com/250x350?text=No+Cover"
          )}" 
          alt="${escapeHtml(proposal.title)}"
          onerror="this.src='https://via.placeholder.com/250x350?text=No+Cover'"
        />
        ${
          proposal.voteCount > 0 && sessionStatus === "Voting"
            ? `
          <div class="vote-count-overlay">
            <span class="vote-number">${proposal.voteCount}</span>
            <span class="vote-label">${
              proposal.voteCount === 1 ? "vote" : "votes"
            }</span>
          </div>
        `
            : ""
        }
      </div>
      <div class="book-proposal-info">
        <h4 class="book-proposal-title">${escapeHtml(proposal.title)}</h4>
        <p class="book-proposal-author">${escapeHtml(
          proposal.author || "Unknown Author"
        )}</p>
        <p class="book-proposal-by">Proposed by ${escapeHtml(
          proposal.proposedBy
        )}</p>
      </div>
    </div>
  `;
    })
    .join("");
}

// PROPOSE BOOK FROM FAVORITES MODAL
async function showProposeFromFavoritesModal() {
  if (!isUserInClub) {
    showToast("You must be a member to propose books", "error");
    return;
  }

  if (!currentVotingSession || currentVotingSession.status !== "Proposing") {
    showToast("Proposing phase is not open", "error");
    return;
  }

  try {
    const response = await fetch(`/api/user/favorites`);

    if (!response.ok) {
      throw new Error("Failed to load favorites");
    }

    const favorites = await response.json();

    if (!favorites || favorites.length === 0) {
      showToast(
        "You don't have any favorite books. Add favorites from the Discover page!",
        "info"
      );
      return;
    }

    displayFavoritesModal(favorites);
  } catch (error) {
    console.error("Error loading favorites:", error);
    showToast("Error loading your favorites", "error");
  }
}

function displayFavoritesModal(favorites) {
  const modal = document.getElementById("propose-favorites-modal");
  const grid = document.getElementById("favorites-books-grid");

  if (!modal || !grid) return;

  grid.innerHTML = favorites
    .map(
      (book) => `
    <div class="favorite-book-card" onclick="proposeBookFromFavorite('${escapeHtml(
      book.isbn
    )}')">
      <div class="favorite-book-cover">
        <img 
          src="${escapeHtml(
            book.coverUrl || "https://via.placeholder.com/150x225?text=No+Cover"
          )}"
          alt="${escapeHtml(book.title)}"
          onerror="this.src='https://via.placeholder.com/150x225?text=No+Cover'"
        />
      </div>
      <div class="favorite-book-info">
        <p class="favorite-book-title">${escapeHtml(book.title)}</p>
        <p class="favorite-book-author">${escapeHtml(
          book.author || "Unknown"
        )}</p>
      </div>
    </div>
  `
    )
    .join("");

  modal.style.display = "flex";
}

function closeFavoritesModal() {
  const modal = document.getElementById("propose-favorites-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

async function proposeBookFromFavorite(isbn) {
  try {
    const response = await fetch(
      `/api/lectureclubs/${currentClubId}/voting/propose`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          isbn: isbn,
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      showToast(data.message, "success");
      closeFavoritesModal();
      await loadVotingSession();
    } else {
      showToast(data.error || "Failed to propose book", "error");
    }
  } catch (error) {
    console.error("Error proposing book:", error);
    showToast("Error proposing book", "error");
  }
}

// VOTE
async function voteForProposal(proposalId) {
  if (!currentUserId || !isUserInClub) {
    showToast("You must be a member to vote", "error");
    return;
  }

  if (!currentVotingSession || currentVotingSession.status !== "Voting") {
    showToast("Voting is not open yet", "error");
    return;
  }

  try {
    const response = await fetch(
      `/api/lectureclubs/${currentClubId}/voting/vote`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          proposalId: proposalId,
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      await loadVotingSession();

      if (data.action === "removed") {
        showToast("Vote removed", "info");
      } else if (data.action === "changed") {
        showToast("Vote changed!", "success");
      } else {
        showToast("Vote registered!", "success");
      }
    } else {
      showToast(data.error || "Failed to vote", "error");
    }
  } catch (error) {
    console.error("Error voting:", error);
    showToast("Error voting", "error");
  }
}

// SHOW VOTING CONTROL BUTTONS
async function updateVotingControls() {
  if (!currentUserId || !isUserInClub) {
    hideVotingControls();
    return;
  }

  try {
    const response = await fetch(
      `/api/lectureclubs/${currentClubId}/voting/active?userId=${currentUserId}`
    );
    const data = await response.json();

    const btnStartVoting = document.getElementById("btn-start-voting");
    const btnOpenVoting = document.getElementById("btn-open-voting");
    const btnCloseVoting = document.getElementById("btn-close-voting");

    if (!data.active) {
      // No active session - show "Start Voting" button
      if (btnStartVoting) btnStartVoting.style.display = "inline-block";
      if (btnOpenVoting) btnOpenVoting.style.display = "none";
      if (btnCloseVoting) btnCloseVoting.style.display = "none";
    } else if (data.session.status === "Proposing") {
      // Proposing phase - show "Open Voting" button
      if (btnStartVoting) btnStartVoting.style.display = "none";
      if (btnOpenVoting) btnOpenVoting.style.display = "inline-block";
      if (btnCloseVoting) btnCloseVoting.style.display = "none";
    } else if (data.session.status === "Voting") {
      // Voting phase - show "Close Voting" button
      if (btnStartVoting) btnStartVoting.style.display = "none";
      if (btnOpenVoting) btnOpenVoting.style.display = "none";
      if (btnCloseVoting) btnCloseVoting.style.display = "inline-block";
    } else {
      // Closed or unknown status
      hideVotingControls();
    }
  } catch (error) {
    console.error("Error updating voting controls:", error);
    hideVotingControls();
  }
}

function hideVotingControls() {
  const btnStartVoting = document.getElementById("btn-start-voting");
  const btnOpenVoting = document.getElementById("btn-open-voting");
  const btnCloseVoting = document.getElementById("btn-close-voting");

  if (btnStartVoting) btnStartVoting.style.display = "none";
  if (btnOpenVoting) btnOpenVoting.style.display = "none";
  if (btnCloseVoting) btnCloseVoting.style.display = "none";
}

// DISPLAY BOOK OF THE MONTH
function displayBookOfTheMonth(bookData) {
  console.log("Displaying Book of the Month:", bookData);

  const section = document.getElementById("book-of-month-section");

  if (!bookData) {
    // No winner yet, hide section
    if (section) section.style.display = "none";
    return;
  }

  // Show section
  if (section) section.style.display = "block";

  // Update cover image
  const coverImg = document.getElementById("book-of-month-cover-img");
  if (coverImg) {
    coverImg.src =
      bookData.coverUrl || "https://via.placeholder.com/200x300?text=No+Cover";
    coverImg.alt = bookData.title;
  }

  // Update title
  const titleEl = document.getElementById("book-of-month-book-title");
  if (titleEl) {
    titleEl.textContent = bookData.title;
  }

  // Update author
  const authorEl = document.getElementById("book-of-month-author");
  if (authorEl) {
    authorEl.textContent = `by ${bookData.author || "Unknown Author"}`;
  }

  // Update selected date
  const selectedEl = document.getElementById("book-of-month-selected");
  if (selectedEl && bookData.selectedAt) {
    const selectedDate = new Date(bookData.selectedAt);
    const formattedDate = selectedDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    selectedEl.textContent = `Selected on ${formattedDate}`;
  }

  // Update links to book details page
  const detailsUrl = `book-details.html?isbn=${encodeURIComponent(
    bookData.isbn
  )}`;

  const coverLink = document.getElementById("book-of-month-link");
  if (coverLink) {
    coverLink.href = detailsUrl;
  }

  const detailsBtn = document.getElementById("book-of-month-details-btn");
  if (detailsBtn) {
    detailsBtn.href = detailsUrl;
  }
}

// VOTING ACTION FUNCTIONS
async function startVotingSession() {
  if (!currentUserId || !isUserInClub) {
    showToast("You must be a member to start voting", "error");
    return;
  }

  const confirmResult = await showVotingConfirm(
    "Start Book Voting Session",
    "This will start a new voting session where members can propose and vote for books.",
    "Start Session",
    false
  );

  if (!confirmResult) return;

  try {
    const response = await fetch(
      `/api/lectureclubs/${currentClubId}/voting/start`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          title: "Book Selection",
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      showToast(data.message, "success");
      await loadVotingSession();
      await updateVotingControls();
      await fetchClubDetails(); // Refresh to show book of the month
    } else {
      showToast(data.error || "Failed to start voting", "error");
    }
  } catch (error) {
    console.error("Error starting voting:", error);
    showToast("Error starting voting session", "error");
  }
}

// VOTING ACTION FUNCTIONS
async function startVotingSession() {
  if (!currentUserId || !isUserInClub) {
    showToast("You must be a member to start voting", "error");
    return;
  }

  const confirmResult = await showVotingConfirm(
    "Start Book Voting Session",
    "This will start a new voting session where members can propose and vote for books.",
    "Start Session",
    false
  );

  if (!confirmResult) return;

  try {
    const response = await fetch(
      `/api/lectureclubs/${currentClubId}/voting/start`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          title: "Book Selection",
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      showToast(data.message, "success");
      await loadVotingSession();
      await updateVotingControls();
      await fetchClubDetails(); // Refresh to show book of the month
    } else {
      showToast(data.error || "Failed to start voting", "error");
    }
  } catch (error) {
    console.error("Error starting voting:", error);
    showToast("Error starting voting session", "error");
  }
}

async function openVotingPhase() {
  if (!currentUserId || !isUserInClub) {
    showToast("You must be a member to open voting", "error");
    return;
  }

  const confirmResult = await showVotingConfirm(
    "Open Voting Phase",
    "This will close proposals and allow members to vote for their favorite book.",
    "Open Voting",
    false
  );

  if (!confirmResult) return;

  try {
    const response = await fetch(
      `/api/lectureclubs/${currentClubId}/voting/open-voting`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      showToast(data.message, "success");
      await loadVotingSession();
      await updateVotingControls();
    } else {
      showToast(data.error || "Failed to open voting", "error");
    }
  } catch (error) {
    console.error("Error opening voting:", error);
    showToast("Error opening voting", "error");
  }
}

async function closeVoting() {
  if (!currentUserId || !isUserInClub) {
    showToast("You must be a member to close voting", "error");
    return;
  }

  const confirmResult = await showVotingConfirm(
    "Close Voting & Declare Winner",
    "This will end voting and select the book with most votes as Book of the Month.",
    "Close Voting",
    false
  );

  if (!confirmResult) return;

  try {
    if (!currentClubId) {
      throw new Error("Club ID is missing");
    }

    console.log(
      "Closing voting for club:",
      currentClubId,
      "user:",
      currentUserId
    );

    const response = await fetch(
      `/api/lectureclubs/${currentClubId}/voting/close`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to close voting");
    }

    const data = await response.json();
    console.log("Voting closed successfully:", data);

    let message = `Winner!!!: "${data.winner.title}" with ${data.winner.voteCount} votes!`;

    if (data.wasTie && data.tiedProposalsCount > 1) {
      message += ` (Selected from ${data.tiedProposalsCount}-way tie)`;
    }

    if (data.winner && data.winner.id) {
      console.log(
        "Adding winning book to members, proposalId:",
        data.winner.id
      );

      const addResponse = await fetch(
        `/api/lectureclubs/${currentClubId}/add-winner-to-reading`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ProposalId: data.winner.id }),
        }
      );

      const addResult = await addResponse.json();

      if (addResponse.ok) {
        console.log("Book added result:", addResult);
        message += `\n\nThe winning book has been added to ${addResult.addedToMembers} members' Currently Reading list!`;
      } else {
        message +=
          "\n\nThere was an issue adding the book to members' reading lists.";
      }
    }

    showToast(message, "success");

    await fetchClubDetails();
    await loadVotingSession();
    await updateVotingControls();
    await fetchReadingList(currentClubId);
  } catch (error) {
    console.error("Error closing voting:", error);
    showToast(`Error closing voting: ${error.message}`, "error");
  }
}

// FETCH AND DISPLAY READING LIST
async function fetchReadingList(clubId) {
  try {
    const response = await fetch(`/api/lectureclubs/${clubId}/reading-list`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const books = await response.json();
    console.log("Reading list:", books);

    displayReadingList(books);
  } catch (error) {
    console.error("Error fetching reading list:", error);
    const booksGrid = document.getElementById("club-books-grid");
    if (booksGrid) {
      booksGrid.innerHTML =
        '<div class="books-loading">Unable to load reading history</div>';
    }
  }
}

function displayReadingList(books) {
  const booksGrid = document.getElementById("club-books-grid");

  if (!booksGrid) {
    console.error("Books grid element not found");
    return;
  }

  if (!books || books.length === 0) {
    booksGrid.innerHTML = `
      <div class="no-books-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 256 256" fill="#cbd5e1">
          <path d="M208,32H160a40.07,40.07,0,0,0-32,16A40.07,40.07,0,0,0,96,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H96a24,24,0,0,1,24,24,8,8,0,0,0,16,0,24,24,0,0,1,24-24h48a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM96,208H48V48H96a24,24,0,0,1,24,24V196.6A40.07,40.07,0,0,0,96,208Zm112,0H160a40.07,40.07,0,0,0-24,8.4V72a24,24,0,0,1,24-24h48Z"></path>
        </svg>
        <p>No books in the reading history yet</p>
        <p style="font-size: 0.9rem; color: #94a3b8; margin-top: 0.5rem;">
          Books selected as "Book of the Month" will appear here
        </p>
      </div>
    `;
    return;
  }

  booksGrid.innerHTML = books
    .map(
      (book) => `
    <div class="club-book-card">
      <a href="book-details.html?isbn=${encodeURIComponent(
        book.isbn
      )}" class="club-book-link">
        <div class="club-book-cover">
          <img 
            src="${escapeHtml(
              book.coverUrl ||
                "https://via.placeholder.com/150x225?text=No+Cover"
            )}"
            alt="${escapeHtml(book.title)}"
            onerror="this.src='https://via.placeholder.com/150x225?text=No+Cover'"
          />
        </div>
        <div class="club-book-info">
          <h4 class="club-book-title">${escapeHtml(book.title)}</h4>
          <p class="club-book-author">${escapeHtml(
            book.author || "Unknown Author"
          )}</p>
          ${
            book.selectedAt
              ? `<p class="club-book-date">📅 ${new Date(
                  book.selectedAt
                ).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                })}</p>`
              : ""
          }
        </div>
      </a>
    </div>
  `
    )
    .join("");
}

async function addWinningBookToAllMembers(clubId, winningProposal) {
  try {
    const bookResponse = await fetch(
      `/api/books/isbn/${encodeURIComponent(winningProposal.isbn)}`
    );

    if (!bookResponse.ok) {
      console.error("Book not found in database");
      return false;
    }

    const bookData = await bookResponse.json();

    // add book to all members
    const response = await fetch(
      `/api/lectureclubs/${clubId}/select-book-of-month`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BookId: bookData.id || bookData.bookId,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error adding book to members:", errorData.message);
      return false;
    }

    const result = await response.json();
    console.log(
      `Book added to ${result.addedToMembers} members' reading lists`
    );
    return true;
  } catch (error) {
    console.error("Error in addWinningBookToAllMembers:", error);
    return false;
  }
}

// FETCH AND DISPLAY READING LIST
async function fetchReadingList(clubId) {
  try {
    const response = await fetch(`/api/lectureclubs/${clubId}/reading-list`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const books = await response.json();
    console.log("Reading list:", books);

    displayReadingList(books);
  } catch (error) {
    console.error("Error fetching reading list:", error);
    const booksGrid = document.getElementById("club-books-grid");
    if (booksGrid) {
      booksGrid.innerHTML =
        '<div class="books-loading">Unable to load reading history</div>';
    }
  }
}
function displayReadingList(books) {
  const booksGrid = document.getElementById("club-books-grid");

  if (!booksGrid) {
    console.error("Books grid element not found");
    return;
  }

  if (!books || books.length === 0) {
    booksGrid.innerHTML = `
      <div class="no-books-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 256 256" fill="#cbd5e1">
          <path d="M208,32H160a40.07,40.07,0,0,0-32,16A40.07,40.07,0,0,0,96,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H96a24,24,0,0,1,24,24,8,8,0,0,0,16,0,24,24,0,0,1,24-24h48a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM96,208H48V48H96a24,24,0,0,1,24,24V196.6A40.07,40.07,0,0,0,96,208Zm112,0H160a40.07,40.07,0,0,0-24,8.4V72a24,24,0,0,1,24-24h48Z"></path>
        </svg>
        <p>No books in the reading history yet</p>
        <p style="font-size: 0.9rem; color: #94a3b8; margin-top: 0.5rem;">
          Books selected as "Book of the Month" will appear here
        </p>
      </div>
    `;
    return;
  }

  booksGrid.innerHTML = books
    .map(
      (book) => `
    <div class="club-book-card">
      <a href="book-details.html?isbn=${encodeURIComponent(
        book.isbn
      )}" class="club-book-link">
        <div class="club-book-cover">
          <img 
            src="${escapeHtml(
              book.coverUrl ||
                "https://via.placeholder.com/150x225?text=No+Cover"
            )}"
            alt="${escapeHtml(book.title)}"
            onerror="this.src='https://via.placeholder.com/150x225?text=No+Cover'"
          />
        </div>
        <div class="club-book-info">
          <h4 class="club-book-title">${escapeHtml(book.title)}</h4>
          <p class="club-book-author">${escapeHtml(
            book.author || "Unknown Author"
          )}</p>
          ${
            book.selectedAt
              ? `<p class="club-book-date">📅 ${new Date(
                  book.selectedAt
                ).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                })}</p>`
              : ""
          }
        </div>
      </a>
    </div>
  `
    )
    .join("");
}

// AUTO-ADD BOOK OF THE MONTH TO CURRENTLY READING
async function autoAddBookToCurrentlyReading(isbn, bookId) {
  try {
    let response;

    // If we have a bookId, use it directly
    if (bookId) {
      response = await fetch("/api/user/currently-reading", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ BookId: bookId }),
      });
    } else if (isbn) {
      // Otherwise, use ISBN
      response = await fetch("/api/user/currently-reading/by-isbn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ Isbn: isbn }),
      });
    } else {
      console.warn("No book identifier available for auto-add");
      return false;
    }

    const data = await response.json();

    if (!response.ok) {
      // If already in list, that's ok
      if (response.status === 400 && data.message.includes("already in")) {
        return true;
      }

      // If unauthorized, fail (user not logged in)
      if (response.status === 401) {
        return false;
      }

      throw new Error(data.message || "Failed to add book");
    }

    console.log("Book of the month added to currently reading:", data);
    return true;
  } catch (error) {
    console.error("Error auto-adding book to currently reading:", error);
    return false;
  }
}

// FETCH AND DISPLAY CLUB BOOKS
// Fetch Club Books
async function fetchClubBooks(clubId) {
  try {
    const response = await fetch(`/api/lectureclubs/${clubId}/books`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Club books:", data);

    displayClubBooks(data.books);
  } catch (error) {
    console.error("Error fetching club books:", error);
    const booksGrid = document.getElementById("club-books-grid");
    if (booksGrid) {
      booksGrid.innerHTML =
        '<div class="books-loading">Unable to load books</div>';
    }
  }
}

// Display Club Books
function displayClubBooks(books) {
  const booksGrid = document.getElementById("club-books-grid");

  if (!booksGrid) {
    console.error("Books grid element not found");
    return;
  }

  if (!books || books.length === 0) {
    booksGrid.innerHTML = `
      <div class="no-books-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 256 256" fill="#cbd5e1">
          <path d="M208,32H160a40.07,40.07,0,0,0-32,16A40.07,40.07,0,0,0,96,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H96a24,24,0,0,1,24,24,8,8,0,0,0,16,0,24,24,0,0,1,24-24h48a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM96,208H48V48H96a24,24,0,0,1,24,24V196.6A40.07,40.07,0,0,0,96,208Zm112,0H160a40.07,40.07,0,0,0-24,8.4V72a24,24,0,0,1,24-24h48Z"></path>
        </svg>
        <p>No books in this club yet</p>
      </div>
    `;
    return;
  }

  booksGrid.innerHTML = "";

  books.forEach((book) => {
    const bookCard = createBookCard(book);
    booksGrid.appendChild(bookCard);
  });
}

function createBookCard(book) {
  const card = document.createElement("div");
  card.className = "club-book-card";
  card.onclick = () => viewBookDetails(book.id);

  // Book cover
  const cover = document.createElement("div");
  cover.className = "club-book-cover";

  if (book.cover) {
    const img = document.createElement("img");
    img.src = book.cover;
    img.alt = book.title;
    img.onerror = function () {
      this.style.display = "none";
      cover.innerHTML = '<div class="club-book-cover-placeholder">📚</div>';
    };
    cover.appendChild(img);
  } else {
    cover.innerHTML = '<div class="club-book-cover-placeholder">📚</div>';
  }

  const info = document.createElement("div");
  info.className = "club-book-info";

  const title = document.createElement("div");
  title.className = "club-book-title";
  title.textContent = book.title;
  title.title = book.title;

  const author = document.createElement("div");
  author.className = "club-book-author";
  author.textContent = book.author || "Unknown Author";

  info.appendChild(title);
  info.appendChild(author);
  card.appendChild(cover);
  return card;
}

function viewBookDetails(bookId) {
  console.log("Viewing book:", bookId);
  window.location.href = `/book-example.html?id=${bookId}`;
}
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// VOTING - SPECIFIC CONFIRMATION DIALOG
function showVotingConfirm(title, message, confirmText, isDestructive = false) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-dialog-overlay show";
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <div class="confirm-dialog-header">
          <h3>${escapeHtml(title)}</h3>
        </div>
        <div class="confirm-dialog-body">
          <p>${escapeHtml(message)}</p>
        </div>
        <div class="confirm-dialog-footer">
          <button class="btn-dialog-cancel">Cancel</button>
          <button class="${
            isDestructive ? "btn-dialog-confirm" : "btn-dialog-proceed"
          }">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector(".btn-dialog-cancel").onclick = () => {
      overlay.remove();
      resolve(false);
    };

    const confirmBtn = overlay.querySelector(
      isDestructive ? ".btn-dialog-confirm" : ".btn-dialog-proceed"
    );
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        overlay.remove();
        resolve(true);
      };
    }

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    };
  });
}

// UTILITIES
// Show Error
function showError(message) {
  if (clubTitle) clubTitle.textContent = "Error";
  if (clubDescription) clubDescription.textContent = message;
}

// Toast Notifications
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 100);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

// START
initializePage();
