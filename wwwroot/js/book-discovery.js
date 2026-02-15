// ============================================
// BOOK DISCOVERY PAGE
// Search and filter books. 
// ============================================

let allBooks = [];
let currentPage = 1;
const booksPerPage = 12;
let searchQuery = "";
let isSearching = false;

// FETCH DEFAULT BOOKS FROM Open Library API
async function fetchAPIBooks() {
  const loading = document.getElementById("loading");
  const container = document.getElementById("booksContainer");

  loading.style.display = "block";
  container.innerHTML = "";

  try {
    console.log("Fetching default books from Open Library API...");
    const response = await fetch("/api/books/discover");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("API Discovery Response:", data);

    // Transform API response
    allBooks = data.docs.map((book) => ({
      title: book.title || "Unknown Title",
      author: Array.isArray(book.authors)
        ? book.authors.join(", ")
        : book.authors || "Unknown Author",
      isbn: book.isbn,
      olid: book.olid,
      workKey: book.workKey,
      coverUrl:
        book.coverUrl || "https://via.placeholder.com/250x350?text=No+Cover",
      publishYear: book.publishYear,
      publisher: book.publisher,
    }));

    console.log("Total books loaded from API:", allBooks.length);
    isSearching = false;
    displayBooks();
  } catch (error) {
    console.error("Error fetching books from API:", error);
    container.innerHTML =
      '<div class="no-books">Error loading books: ' + error.message + "</div>";
    allBooks = [];
  } finally {
    loading.style.display = "none";
  }
}


// SEARCH BOOKS FROM Open Library API
async function searchBooksFromAPI(query) {
  if (!query || query.length < 2) {
    fetchAPIBooks();
    return;
  }

  const loading = document.getElementById("loading");
  const container = document.getElementById("booksContainer");

  loading.style.display = "block";
  container.innerHTML = "";

  try {
    console.log("Searching Open Library API for:", query);
    const response = await fetch(
      `/api/books/search-external?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Search API Response:", data);

    allBooks = data.docs.map((book) => ({
      title: book.title || "Unknown Title",
      author: Array.isArray(book.authors)
        ? book.authors.join(", ")
        : book.authors || "Unknown Author",
      isbn: book.isbn,
      olid: book.olid,
      workKey: book.workKey,
      coverUrl:
        book.coverUrl || "https://via.placeholder.com/250x350?text=No+Cover",
      publishYear: book.publishYear,
      publisher: book.publisher,
    }));

    console.log("Total search results:", allBooks.length);
    isSearching = true;
    currentPage = 1;
    displayBooks();
  } catch (error) {
    console.error("Error searching books:", error);
    container.innerHTML =
      '<div class="no-books">Error searching books: ' +
      error.message +
      "</div>";
    allBooks = [];
  } finally {
    loading.style.display = "none";
  }
}


// DISPLAY BOOKS
function displayBooks() {
  const container = document.getElementById("booksContainer");

  console.log("Displaying books. Total count:", allBooks.length);

  if (!allBooks || allBooks.length === 0) {
    container.innerHTML = isSearching
      ? '<div class="no-books">No books found for your search</div>'
      : '<div class="no-books">No books available</div>';
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  const sortedBooks = sortBooks(allBooks, currentSortOption);

  const startIdx = (currentPage - 1) * booksPerPage;
  const endIdx = startIdx + booksPerPage;
  const booksToShow = sortedBooks.slice(startIdx, endIdx);

  console.log(
    `Showing books ${startIdx + 1} to ${Math.min(
      endIdx,
      sortedBooks.length
    )} of ${sortedBooks.length}`
  );

  container.innerHTML = booksToShow
    .map((book) => {
      const bookIsbn = book.isbn || "";
      const bookOlid = book.olid || "";
      const bookWorkKey = book.workKey || "";

      console.log(
        "Book:",
        book.title,
        "ISBN:",
        bookIsbn,
        "OLID:",
        bookOlid,
        "WorkKey:",
        bookWorkKey
      );

      return `
        <div class="book-card" onclick='viewBook("${escapeHtml(
          bookIsbn
        )}", "${escapeHtml(bookOlid)}", "${escapeHtml(bookWorkKey)}")'>
          <img 
            class="book-cover" 
            src="${escapeHtml(book.coverUrl)}" 
            alt="${escapeHtml(book.title)}"
            onerror="this.src='https://via.placeholder.com/250x350?text=No+Cover'"
          >
          <div class="book-info">
            <div class="book-title">${escapeHtml(book.title)}</div>
            <div class="book-author">by ${escapeHtml(book.author)}</div>
          </div>
        </div>
      `;
    })
    .join("");

  displayPagination(sortedBooks.length);
}


// DISPLAY PAGINATION
function displayPagination(totalBooks) {
  const totalPages = Math.ceil(totalBooks / booksPerPage);
  const pagination = document.getElementById("pagination");

  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  let html = `
    <button onclick="changePage(${currentPage - 1})" ${
    currentPage === 1 ? "disabled" : ""
  }>
      ← Previous
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 2 && i <= currentPage + 2)
    ) {
      html += `
        <button 
          onclick="changePage(${i})" 
          class="${i === currentPage ? "active" : ""}"
        >
          ${i}
        </button>
      `;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      html += "<button disabled>...</button>";
    }
  }

  html += `
    <button onclick="changePage(${currentPage + 1})" ${
    currentPage === totalPages ? "disabled" : ""
  }>
      Next →
    </button>
  `;

  pagination.innerHTML = html;
}

// Change page
function changePage(page) {
  const totalPages = Math.ceil(allBooks.length / booksPerPage);
  if (page < 1 || page > totalPages) return;

  currentPage = page;
  displayBooks();
  window.scrollTo({ top: 0, behavior: "smooth" });
}


// VIEW BOOK DETAILS
function viewBook(isbn, olid, workKey) {
  console.log(
    "viewBook called with ISBN:",
    isbn,
    "OLID:",
    olid,
    "WorkKey:",
    workKey
  );

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

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// SEARCH 
// Search functionality with debounce
let searchTimeout;
const searchInput = document.getElementById("searchInput");

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();

    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
      searchBooksFromAPI(searchQuery);
    }, 500);
  });
}

// Check if there is a search query in URL
function checkURLsearch() {
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get("search");

  if (searchParam) {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.value = searchParam;
      searchBooksFromAPI(searchParam);
    }
  } else {
    // Load defualt books only if no search param
    fetchAPIBooks();
  }
}

// Order by 
const sortSelect = document.getElementById("sortSelect");

if (sortSelect) {
  sortSelect.addEventListener("change", (e) => {
    currentSortOption = e.target.value;
    console.log("Sort option changed to:", currentSortOption);

    currentPage = 1; //First page when changing the order.

    displayBooks(); //Show the books in new order.

    window.scrollTo({ top: 0, behavior: "smooth" }); //Scroll you to the top of the window, smooth.
  });
}

let currentSortOption = null;

function sortBooks(books, sortOption) {
  if (!sortOption) {
    return books;
  }

  const sortedBooks = [...books]; // Copy the original array

  switch (sortOption) {
    case "title-asc":
      sortedBooks.sort((a, b) => a.title.localeCompare(b.title));
      break;

    case "title-desc":
      sortedBooks.sort((a, b) => b.title.localeCompare(a.title));
      break;

    case "author":
      sortedBooks.sort((a, b) => a.author.localeCompare(b.author));
      break;

    case "date":
      sortedBooks.sort((a, b) => {
        const yearA = a.publishYear || 0;
        const yearB = b.publishYear || 0;
        return yearB - yearA; // Most recent
      });
      break;

    default:
      return books; // Return with no specific order (as the API)
  }

  return sortedBooks;
}


// START
console.log(
  "Page loaded, checking for search params or fetching default books from Open Library..."
);
checkURLsearch();
