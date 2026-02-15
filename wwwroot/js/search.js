let headerSearchResults = [];
let headerSearchQuery = "";
let headerSearchTimeout;
const MAX_HEADER_RESULTS = 2;

// Search books from Open Library API
async function searchHeaderBooks(query) {
    if (!query || query.length < 2) {
        hideHeaderSearchResults();
        return;
    }

    const searchResults = document.getElementById("search-results");
    if (!searchResults) return;

    // Show loading state
    searchResults.innerHTML = '<div class="header-search-loading">Searching...</div>';
    searchResults.classList.add("show");

    try {
        console.log("Header searching Open Library API for:", query);
        const response = await fetch(
            `/api/books/search-external?q=${encodeURIComponent(query)}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Search API Response:", data);

        headerSearchResults = data.docs.map((book) => ({
            title: book.title || "Unknown Title",
            author: Array.isArray(book.authors)
                ? book.authors.join(", ")
                : book.authors || "Unknown Author",
            coverUrl: book.coverUrl || "https://via.placeholder.com/250x350?text=No+Cover",
            isbn: book.isbn,
            olid: book.olid,
            workKey: book.workKey,
        }));

        console.log("Total header search results:", headerSearchResults.length);
        headerSearchQuery = query;
        displayHeaderResults();
    } catch (error) {
        console.error("Error searching books in header:", error);
        searchResults.innerHTML =
            '<div class="header-search-no-results">Error searching books: ' +
            error.message +
            "</div>";
        headerSearchResults = [];
    }
}

// DISPLAY
// Display header search results
function displayHeaderResults() {
    const searchResults = document.getElementById("search-results");

    if (!searchResults) return;

    console.log("Displaying header results. Total count:", headerSearchResults.length);

    if (!headerSearchResults || headerSearchResults.length === 0) {
        searchResults.innerHTML = '<div class="no-books">No books found</div>';
        return;
    }

    // Show only first 3 results
    const booksToShow = headerSearchResults.slice(0, MAX_HEADER_RESULTS);
    const hasMore = headerSearchResults.length > MAX_HEADER_RESULTS;

    console.log(
        `Showing books ${booksToShow.length} of ${headerSearchResults.length} results in header`
    );

    let html = booksToShow
        .map((book) => {
            const bookIsbn = book.isbn || "";
            const bookOlid = book.olid || "";
            const bookWorkKey = book.workKey || "";

            console.log("Book:", book.title, "ISBN:", bookIsbn, "OLID:", bookOlid, "WorkKey:", bookWorkKey);

            return `
        <div class="header-search-item" onclick='viewBookFromHeader("${escapeHtml(bookIsbn)}", "${escapeHtml(bookOlid)}", "${escapeHtml(bookWorkKey)}")'>
          <img 
            class="header-search-thumbnail" 
            src="${escapeHtml(book.coverUrl)}" 
            alt="${escapeHtml(book.title)}"
            onerror="this.src='https://via.placeholder.com/250x350?text=No+Cover'"
          >
          <div class="header-search-content">
            <div class="header-search-title">${escapeHtml(book.title)}</div>
            <div class="header-search-author">${escapeHtml(book.author)}</div>
          </div>
        </div>
      `;
        })
        .join("");

    // Add "Show More" button if there are more results
    if (hasMore) {
        html += `
            <div class="header-search-show-more" onclick='showMoreHeaderResults()'>
                Show more results
            </div>
          `;
    }

    searchResults.innerHTML = html;
    searchResults.classList.add("show");
}

// View book details from header
function viewBookFromHeader(isbn, olid, workKey) {
    console.log("viewBook called with ISBN:", isbn, "OLID:", olid, "WorkKey:", workKey);

    if (isbn && isbn !== "") {
        window.location.href = `/book-details.html?isbn=${encodeURIComponent(isbn)}`;
    } else if (olid && olid !== "") {
        window.location.href = `/book-details.html?olid=${encodeURIComponent(olid)}`;
    } else if (workKey && workKey !== "") {
        const cleanKey = workKey.startsWith("/") ? workKey.substring(1) : workKey;
        window.location.href = `/book-details.html?workKey=${encodeURIComponent(cleanKey)}`;
    } else {
        console.error("No valid identifier provided");
        alert("Book information not available");
    }
}

// Show more results - redirecting to discovery page with search query
function showMoreHeaderResults() {
    console.log("Redirecting to discovery with query:", headerSearchQuery);
    window.location.href = `/book-discovery.html?search=${encodeURIComponent(headerSearchQuery)}`;
}

// Hide header search results
function hideHeaderSearchResults() {
    const searchResults = document.getElementById("search-results");
    if (searchResults) {
        searchResults.classList.remove("show");
        setTimeout(() => {
            searchResults.innerHTML = "";
        }, 250);
    }
}
// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// SEARCH FUNCTIONALITY
// Initialize header search functionality
function initHeaderSearch() {
    const searchInput = document.getElementById("search-input");
    const searchResults = document.getElementById("search-results");

    if (!searchInput || !searchResults) {
        console.log("Header search elements not found");
        return;
    }

    console.log("Initializing header search...");

    // Search on input with debounce
    searchInput.addEventListener("input", (e) => {
        headerSearchQuery = e.target.value.trim();

        clearTimeout(headerSearchTimeout);

        if (headerSearchQuery.length < 2) {
            hideHeaderSearchResults();
            return;
        }

        headerSearchTimeout = setTimeout(() => {
            searchHeaderBooks(headerSearchQuery);
        }, 500);
    });

    // Close search results when clicking outside 
    document.addEventListener("click", (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            hideHeaderSearchResults();
        }
    });

    // Keep results open when clicking inside search area
    searchInput.addEventListener("click", (e) => {
        e.stopPropagation();
        if (headerSearchResults.length > 0 && headerSearchQuery.length >= 2) {
            searchResults.classList.add("show");
        }
    });

    searchResults.addEventListener("click", (e) => {
        e.stopPropagation();
    });

    // Clear results when input is cleared
    searchInput.addEventListener("focus", () => {
        if (headerSearchResults.length > 0 && headerSearchQuery.lenght >= 2) {
            searchResults.classList.add("show");
        }
    });
}

// Initialize on page load
console.log("Header search script loaded");
document.addEventListener("DOMContentLoaded", initHeaderSearch);