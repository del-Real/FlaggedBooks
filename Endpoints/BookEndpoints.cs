using FlaggedBooks.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlaggedBooks.Endpoints;

public static class BookEndpoints
{
    public static void MapBookEndpoints(this WebApplication app)
    {
        // INTEGRATION WITH BOOK API (Open Library)

        // GET - Returns a list of default books for discovery page from API (50 books by default)
        app.MapGet("/api/books/discover", async (BookService service, HttpContext context) =>
        {
            // Set cache headers
            context.Response.Headers.CacheControl = "public, max-age=3600"; // cache for 1h
            context.Response.Headers.Vary = "Accept-Encoding";

            var results = await service.SearchBooksAsync("fantasy", 50);
            if (results == null || !results.Docs.Any())
            {
                return Results.Json(new { docs = new List<object>(), numFound = 0 });
            }

            var books = results.Docs
                .Select(doc => new
                {
                    title = doc.Title,
                    authors = doc.AuthorName ?? new List<string>(),
                    isbn = doc.ISBN?.FirstOrDefault(),
                    olid = doc.EditionKey?.FirstOrDefault(),
                    workKey = doc.Key?.TrimStart('/'),
                    publishYear = doc.FirstPublishYear,
                    coverUrl = doc.GetCoverUrl(),
                    publisher = doc.Publisher?.FirstOrDefault()
                    
                })
                .Take(50)
                .ToList();

            return Results.Json(new
            {
                docs = books,
                numFound = books.Count
            });
        });

        // GET - Searches Book API by query string with customizable limit (50 results by default)
        app.MapGet("/api/books/search-external", async (
            BookService service,
            HttpContext context,
            [FromQuery] string q,
            [FromQuery] int limit = 50) =>
        {
            if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            {
                return Results.BadRequest(new { error = "Query must be at least 2 characters" });
            }

            // Set cache headers: cache for 30 minutes (1800 seconds)
            context.Response.Headers.CacheControl = "public, max-age=1800";
            context.Response.Headers.Vary = "Accept-Encoding";

            var results = await service.SearchBooksAsync(q, limit);
            if (results == null)
            {
                return Results.Json(new { docs = new List<object>(), numFound = 0 });
            }

            var books = results.Docs.Select(doc => new
            {
                title = doc.Title,
                authors = doc.AuthorName ?? new List<string>(),
                isbn = doc.ISBN?.FirstOrDefault(),
                olid = doc.EditionKey?.FirstOrDefault(),
                workKey = doc.Key?.TrimStart('/'),
                publishYear = doc.FirstPublishYear,
                coverUrl = doc.GetCoverUrl(),
                publisher = doc.Publisher?.FirstOrDefault()
            });

            return Results.Json(new
            {
                docs = books,
                numFound = results.NumFound
            });
        });

        // GET - Retrieves detailed book information using ISBN identifier
        app.MapGet("/api/books/isbn/{isbn}", async (
            BookService service,
            string isbn) =>
        {
            var book = await service.GetBookByISBNAsync(isbn);

            if (book == null)
            {
                return Results.NotFound(new { error = "Book not found" });
            }

            // GENERAR RATINGS ALEATORIOS (provisional)
            var random = new Random();
            var ratingsAverage = Math.Round(random.NextDouble() * 5, 1); // 0.0 a 5.0
            var ratingsCount = random.Next(50, 2000); // Entre 50 y 2000 votos

            return Results.Json(new
            {
                title = book.Title,
                authors = book.Authors,
                isbn = book.ISBN,
                description = book.Description,
                coverUrl = book.CoverUrl,
                publishDate = book.PublishDate,
                publishers = book.Publishers,
                numberOfPages = book.NumberOfPages,
                ratings_average = ratingsAverage,
                ratings_count = ratingsCount
            });
        });

        // GET - Retrieves detailed book information using OLID (Open Library ID)
        app.MapGet("/api/books/olid/{olid}", async (
            BookService service,
            string olid) =>
        {
            var book = await service.GetBookByOLIDAsync(olid);

            if (book == null)
            {
                return Results.NotFound(new { error = "Book not found" });
            }

            // GENERAR RATINGS ALEATORIOS (provisional)
            var random = new Random();
            var ratingsAverage = Math.Round(random.NextDouble() * 5, 1); // 0.0 a 5.0
            var ratingsCount = random.Next(50, 2000); // Entre 50 y 2000 votos

            return Results.Json(new
            {
                title = book.Title,
                authors = book.Authors,
                isbn = book.ISBN,
                description = book.Description,
                coverUrl = book.CoverUrl,
                publishDate = book.PublishDate,
                publishers = book.Publishers,
                numberOfPages = book.NumberOfPages,
                ratings_average = ratingsAverage,
                ratings_count = ratingsCount
            });
        });

        // GET - Retrieves book information using Open Library work key (includes ISBN10, ISBN13, and edition key)
        app.MapGet("/api/books/work/{*workKey}", async (
        BookService service,
        string workKey) =>
        {
            var fullWorkKey = "/" + workKey;
            var book = await service.GetBookByWorkKeyAsync(fullWorkKey);

            if (book == null)
            {
                return Results.NotFound(new { error = "Book not found" });
            }

            // GENERAR RATINGS ALEATORIOS (provisional)
            var random = new Random();
            var ratingsAverage = Math.Round(random.NextDouble() * 5, 1); // 0.0 a 5.0
            var ratingsCount = random.Next(50, 2000); // Entre 50 y 2000 votos

            return Results.Json(new
            {
                title = book.Title,
                authors = book.Authors,
                isbn = book.ISBN,
                isbn10 = book.ISBN10,
                isbn13 = book.ISBN13,
                editionKey = book.EditionKey,
                description = book.Description,
                coverUrl = book.CoverUrl,
                publishDate = book.PublishDate,
                publishers = book.Publishers,
                numberOfPages = book.NumberOfPages,
                ratings_average = ratingsAverage,
                ratings_count = ratingsCount
            });
        });

        // POST - Imports a book from book API into the local database by ISBN (prevents duplicates)
        app.MapPost("/api/books/import/{isbn}", async (
            BookService service,
            AppDbContext db,
            string isbn) =>
        {
            var existingBook = await db.Books.FirstOrDefaultAsync(b => b.ISBN == isbn);
            if (existingBook != null)
            {
                return Results.BadRequest(new { error = "Book already exists in database" });
            }

            var bookData = await service.GetBookByISBNAsync(isbn);

            if (bookData == null)
            {
                return Results.NotFound(new { error = "Book not found in Open Library" });
            }

            var newBook = new Book
            {
                Title = bookData.Title,
                Author = string.Join(", ", bookData.Authors),
                ISBN = bookData.ISBN,
                Description = bookData.Description,
                Cover = bookData.CoverUrl,
                CreatedAt = DateTime.UtcNow
            };

            db.Books.Add(newBook);
            await db.SaveChangesAsync();

            return Results.Json(new
            {
                success = true,
                message = "Book imported successfully",
                book = newBook
            });
        });
    }
}