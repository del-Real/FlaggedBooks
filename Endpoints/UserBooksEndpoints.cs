using FlaggedBooks.Models;
using Microsoft.EntityFrameworkCore;

namespace FlaggedBooks.Endpoints;

public static class UserBooksEndpoints
{
    public static void MapUserBooksEndpoints(this WebApplication app)
    {
        // OWN PROFILE
        // GET - Currently reading books 
        app.MapGet("/api/user/currently-reading", async (HttpContext context, AppDbContext db) =>
        {
            var userId = context.Session.GetString("UserId");

            if (string.IsNullOrEmpty(userId))
            {
                return Results.Json(new { success = false, message = "Unauthorized" }, statusCode: 401);
            }

            var userBooks = await db.UserBooks
                .Include(ub => ub.Book)
                .Where(ub => ub.UserId == int.Parse(userId) && ub.Status == "reading")
                .OrderByDescending(ub => ub.AddedAt)
                .ToListAsync();

            var result = userBooks.Select(ub => new
            {
                id = ub.Id,
                isbn = ub.Book?.ISBN,
                title = ub.Book?.Title,
                author = ub.Book?.Author,
                coverUrl = ub.Book?.Cover,
                progress = ub.Progress,
                addedAt = ub.AddedAt
            });

            return Results.Json(result);
        });

        // GET - Favourite books (own profile)
        app.MapGet("/api/user/favorites", async (HttpContext context, AppDbContext db) =>
        {
            var userId = context.Session.GetString("UserId");

            if (string.IsNullOrEmpty(userId))
            {
                return Results.Json(new { success = false, message = "Unauthorized" }, statusCode: 401);
            }

            var userBooks = await db.UserBooks
                .Include(ub => ub.Book)
                .Where(ub => ub.UserId == int.Parse(userId) && ub.Status == "favorite")
                .OrderByDescending(ub => ub.AddedAt)
                .ToListAsync();

            var result = userBooks.Select(ub => new
            {
                id = ub.Id,
                isbn = ub.Book?.ISBN,
                title = ub.Book?.Title,
                author = ub.Book?.Author,
                coverUrl = ub.Book?.Cover,
                addedAt = ub.AddedAt
            });

            return Results.Json(result);
        });

        // GET - Completed books (own profile)
        app.MapGet("/api/user/completed", async (HttpContext context, AppDbContext db) =>
        {
            var userId = context.Session.GetString("UserId");

            if (string.IsNullOrEmpty(userId))
            {
                return Results.Json(new { success = false, message = "Unauthorized" }, statusCode: 401);
            }

            var userBooks = await db.UserBooks
                .Include(ub => ub.Book)
                .Where(ub => ub.UserId == int.Parse(userId) && ub.Status == "completed")
                .OrderByDescending(ub => ub.AddedAt)
                .ToListAsync();

            var result = userBooks.Select(ub => new
            {
                id = ub.Id,
                isbn = ub.Book?.ISBN,
                title = ub.Book?.Title,
                author = ub.Book?.Author,
                coverUrl = ub.Book?.Cover,
                addedAt = ub.AddedAt
            });

            return Results.Json(result);
        });

        // OTHER PROFILE
        // GET - Currently reading books (other user's profile)
        app.MapGet("/api/user/{targetuserId}/currently-reading", async (HttpContext context, AppDbContext db, int targetUserId) =>
        {
            var targetUser = await db.Users.FindAsync(targetUserId);
            if (targetUser == null)
            {
                return Results.Json(new { success = false, message = "User not found" }, statusCode: 404);
            }

            var userBooks = await db.UserBooks
                .Include(ub => ub.Book)
                .Where(ub => ub.UserId == targetUserId && ub.Status == "reading")
                .OrderByDescending(ub => ub.AddedAt)
                .ToListAsync();

            var result = userBooks.Select(ub => new
            {
                id = ub.Id,
                isbn = ub.Book?.ISBN,
                title = ub.Book?.Title,
                author = ub.Book?.Author,
                coverUrl = ub.Book?.Cover,
                progress = ub.Progress,
                addedAt = ub.AddedAt
            });

            return Results.Json(result);
        });

        // GET - Favourite books (other user's profile)
        app.MapGet("/api/user/{targetuserId}/favorites", async (HttpContext context, AppDbContext db, int targetUserId) =>
        {
            var targetUser = await db.Users.FindAsync(targetUserId);
            if (targetUser == null)
            {
                return Results.Json(new { success = false, message = "User not found" }, statusCode: 404);
            }

            var userBooks = await db.UserBooks
                .Include(ub => ub.Book)
                .Where(ub => ub.UserId == targetUserId && ub.Status == "favorite")
                .OrderByDescending(ub => ub.AddedAt)
                .ToListAsync();

            var result = userBooks.Select(ub => new
            {
                id = ub.Id,
                isbn = ub.Book?.ISBN,
                title = ub.Book?.Title,
                author = ub.Book?.Author,
                coverUrl = ub.Book?.Cover,
                progress = ub.Progress,
                addedAt = ub.AddedAt
            });

            return Results.Json(result);
        });

        // GET - Completed (other user's profile)
        app.MapGet("/api/user/{targetuserId}/completed", async (HttpContext context, AppDbContext db, int targetUserId) =>
        {
            var targetUser = await db.Users.FindAsync(targetUserId);
            if (targetUser == null)
            {
                return Results.Json(new { success = false, message = "User not found" }, statusCode: 404);
            }

            var userBooks = await db.UserBooks
                .Include(ub => ub.Book)
                .Where(ub => ub.UserId == targetUserId && ub.Status == "completed")
                .OrderByDescending(ub => ub.AddedAt)
                .ToListAsync();

            var result = userBooks.Select(ub => new
            {
                id = ub.Id,
                isbn = ub.Book?.ISBN,
                title = ub.Book?.Title,
                author = ub.Book?.Author,
                coverUrl = ub.Book?.Cover,
                progress = ub.Progress,
                addedAt = ub.AddedAt
            });

            return Results.Json(result);
        });

        // POST - Add book to Currently Reading
        app.MapPost("/api/user/currently-reading", async (
            HttpContext context,
            AppDbContext db,
            AddBookByIdRequest request) =>
        {
            var userId = context.Session.GetString("UserId");

            if (string.IsNullOrEmpty(userId))
            {
                return Results.Json(new { success = false, message = "Unauthorized" }, statusCode: 401);
            }

            // Check if the book exists
            var book = await db.Books.FindAsync(request.BookId);
            if (book == null)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "Book not found in database"
                }, statusCode: 404);
            }

            // Check if the book is already in the list
            var existingBook = await db.UserBooks
                .FirstOrDefaultAsync(ub =>
                    ub.UserId == int.Parse(userId) &&
                    ub.BookId == request.BookId &&
                    ub.Status == "reading");

            if (existingBook != null)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "Book already in currently reading list"
                }, statusCode: 400);
            }

            var userBook = new UserBook
            {
                UserId = int.Parse(userId),
                BookId = request.BookId,
                Status = "reading",
                Progress = 0,
                AddedAt = DateTime.UtcNow
            };

            db.UserBooks.Add(userBook);
            await db.SaveChangesAsync();

            // Load the book to return it
            await db.Entry(userBook).Reference(ub => ub.Book).LoadAsync();

            return Results.Json(new
            {
                success = true,
                message = "Book added to currently reading",
                book = new
                {
                    id = userBook.Id,
                    isbn = userBook.Book?.ISBN,
                    title = userBook.Book?.Title,
                    author = userBook.Book?.Author,
                    coverUrl = userBook.Book?.Cover,
                    progress = userBook.Progress
                }
            });
        });

        // POST - Add book by ISBN (import if not exists)
        app.MapPost("/api/user/currently-reading/by-isbn", async (
             HttpContext context,
             AppDbContext db,
             FlaggedBooks.Services.BookService bookService,
             AddBookByIsbnRequest request) =>
        {
            var userId = context.Session.GetString("UserId");

            if (string.IsNullOrEmpty(userId))
            {
                return Results.Json(new { success = false, message = "Unauthorized" }, statusCode: 401);
            }

            // Search if the book already exists in the database
            var book = await db.Books.FirstOrDefaultAsync(b => b.ISBN == request.Isbn);

            // If it doesn’t, import it from Open Library
            if (book == null)
            {
                var bookData = await bookService.GetBookByISBNAsync(request.Isbn);

                if (bookData == null)
                {
                    return Results.Json(new
                    {
                        success = false,
                        message = "Book not found in Open Library"
                    }, statusCode: 404);
                }

                book = new Book
                {
                    Title = bookData.Title,
                    Author = string.Join(", ", bookData.Authors),
                    ISBN = bookData.ISBN,
                    Description = bookData.Description,
                    Cover = bookData.CoverUrl,
                    CreatedAt = DateTime.UtcNow
                };

                db.Books.Add(book);
                await db.SaveChangesAsync();
            }

            // Check if the book is already in the list
            var existingUserBook = await db.UserBooks
                .FirstOrDefaultAsync(ub =>
                    ub.UserId == int.Parse(userId) &&
                    ub.BookId == book.Id &&
                    ub.Status == "reading");

            if (existingUserBook != null)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "Book already in currently reading list"
                }, statusCode: 400);
            }

            // Add to the user’s list
            var userBook = new UserBook
            {
                UserId = int.Parse(userId),
                BookId = book.Id,
                Status = "reading",
                Progress = 0,
                AddedAt = DateTime.UtcNow
            };

            db.UserBooks.Add(userBook);
            await db.SaveChangesAsync();

            return Results.Json(new
            {
                success = true,
                message = "Book added to currently reading",
                book = new
                {
                    id = userBook.Id,
                    isbn = book.ISBN,
                    title = book.Title,
                    author = book.Author,
                    coverUrl = book.Cover,
                    progress = userBook.Progress
                }
            });
        });

        // POST - Add book to Favourite
        app.MapPost("/api/user/favorites", async (
            HttpContext context,
            AppDbContext db,
            AddBookByIdRequest request) =>
        {
            var userId = context.Session.GetString("UserId");

            if (string.IsNullOrEmpty(userId))
            {
                return Results.Json(new { success = false, message = "Unauthorized" }, statusCode: 401);
            }

            var book = await db.Books.FindAsync(request.BookId);
            if (book == null)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "Book not found in database"
                }, statusCode: 404);
            }

            var existingBook = await db.UserBooks
                .FirstOrDefaultAsync(ub =>
                    ub.UserId == int.Parse(userId) &&
                    ub.BookId == request.BookId &&
                    ub.Status == "favorite");

            if (existingBook != null)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "Book already in favorites"
                }, statusCode: 400);
            }

            var userBook = new UserBook
            {
                UserId = int.Parse(userId),
                BookId = request.BookId,
                Status = "favorite",
                Progress = 0,
                AddedAt = DateTime.UtcNow
            };

            db.UserBooks.Add(userBook);
            await db.SaveChangesAsync();

            await db.Entry(userBook).Reference(ub => ub.Book).LoadAsync();

            return Results.Json(new
            {
                success = true,
                message = "Book added to favorites",
                book = new
                {
                    id = userBook.Id,
                    isbn = userBook.Book?.ISBN,
                    title = userBook.Book?.Title,
                    author = userBook.Book?.Author,
                    coverUrl = userBook.Book?.Cover
                }
            });
        });

        // POST - Add book by ISBN (import if not exists)
        app.MapPost("/api/user/favorites/by-isbn", async (
            HttpContext context,
            AppDbContext db,
            FlaggedBooks.Services.BookService bookService,
            AddBookByIsbnRequest request) =>
        {
            var userId = context.Session.GetString("UserId");

            if (string.IsNullOrEmpty(userId))
            {
                return Results.Json(new { success = false, message = "Unauthorized" }, statusCode: 401);
            }

            // Search if the book already exists in the database
            var book = await db.Books.FirstOrDefaultAsync(b => b.ISBN == request.Isbn);

            // If it doesn’t, import it from Open Library
            if (book == null)
            {
                var bookData = await bookService.GetBookByISBNAsync(request.Isbn);

                if (bookData == null)
                {
                    return Results.Json(new
                    {
                        success = false,
                        message = "Book not found in Open Library"
                    }, statusCode: 404);
                }

                book = new Book
                {
                    Title = bookData.Title,
                    Author = string.Join(", ", bookData.Authors),
                    ISBN = bookData.ISBN,
                    Description = bookData.Description,
                    Cover = bookData.CoverUrl,
                    CreatedAt = DateTime.UtcNow
                };

                db.Books.Add(book);
                await db.SaveChangesAsync();
            }

            // Check if the book is already in the list
            var existingUserBook = await db.UserBooks
                .FirstOrDefaultAsync(ub =>
                    ub.UserId == int.Parse(userId) &&
                    ub.BookId == book.Id &&
                    ub.Status == "favorite");

            if (existingUserBook != null)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "Book already in favorites"
                }, statusCode: 400);
            }

            // Add to favorites
            var userBook = new UserBook
            {
                UserId = int.Parse(userId),
                BookId = book.Id,
                Status = "favorite",
                Progress = 0,
                AddedAt = DateTime.UtcNow
            };

            db.UserBooks.Add(userBook);
            await db.SaveChangesAsync();

            return Results.Json(new
            {
                success = true,
                message = "Book added to favorites",
                book = new
                {
                    id = userBook.Id,
                    isbn = book.ISBN,
                    title = book.Title,
                    author = book.Author,
                    coverUrl = book.Cover
                }
            });
        });

        // POST - Add book to Completed books
        app.MapPost("/api/user/completed", async (
            HttpContext context,
            AppDbContext db,
            AddBookByIdRequest request) =>
        {
            var userId = context.Session.GetString("UserId");

            if (string.IsNullOrEmpty(userId))
            {
                return Results.Json(new { success = false, message = "Unauthorized" }, statusCode: 401);
            }

            // Search if the book already exists in the database
            var book = await db.Books.FindAsync(request.BookId);
            if (book == null)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "Book not found in database"
                }, statusCode: 404);
            }

            // Check if the book is already in the list
            var existingBook = await db.UserBooks
                .FirstOrDefaultAsync(ub =>
                    ub.UserId == int.Parse(userId) &&
                    ub.BookId == request.BookId &&
                    ub.Status == "completed");

            if (existingBook != null)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "Book already in completed list"
                }, statusCode: 400);
            }

            var userBook = new UserBook
            {
                UserId = int.Parse(userId),
                BookId = request.BookId,
                Status = "completed",
                Progress = 0,
                AddedAt = DateTime.UtcNow
            };

            db.UserBooks.Add(userBook);
            await db.SaveChangesAsync();

            // Load the book to return it
            await db.Entry(userBook).Reference(ub => ub.Book).LoadAsync();

            return Results.Json(new
            {
                success = true,
                message = "Book added to completed books",
                book = new
                {
                    id = userBook.Id,
                    isbn = userBook.Book?.ISBN,
                    title = userBook.Book?.Title,
                    author = userBook.Book?.Author,
                    coverUrl = userBook.Book?.Cover
                }
            });
        });

        // POST: Add book by ISBN (import if not exists)
        app.MapPost("/api/user/completed/by-isbn", async (
            HttpContext context,
            AppDbContext db,
            FlaggedBooks.Services.BookService bookService,
            AddBookByIsbnRequest request) =>
        {
            var userId = context.Session.GetString("UserId");

            if (string.IsNullOrEmpty(userId))
            {
                return Results.Json(new { success = false, message = "Unauthorized" }, statusCode: 401);
            }

            // Search if the book already exists in the database
            var book = await db.Books.FirstOrDefaultAsync(b => b.ISBN == request.Isbn);

            // If it doesn’t, import it from Open Library
            if (book == null)
            {
                var bookData = await bookService.GetBookByISBNAsync(request.Isbn);

                if (bookData == null)
                {
                    return Results.Json(new
                    {
                        success = false,
                        message = "Book not found in Open Library"
                    }, statusCode: 404);
                }

                book = new Book
                {
                    Title = bookData.Title,
                    Author = string.Join(", ", bookData.Authors),
                    ISBN = bookData.ISBN,
                    Description = bookData.Description,
                    Cover = bookData.CoverUrl,
                    CreatedAt = DateTime.UtcNow
                };

                db.Books.Add(book);
                await db.SaveChangesAsync();
            }

            // Check if the book is already in the list
            var existingUserBook = await db.UserBooks
                .FirstOrDefaultAsync(ub =>
                    ub.UserId == int.Parse(userId) &&
                    ub.BookId == book.Id &&
                    ub.Status == "completed");

            if (existingUserBook != null)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "Book already in completed list"
                }, statusCode: 400);
            }

            // Add to the user’s list
            var userBook = new UserBook
            {
                UserId = int.Parse(userId),
                BookId = book.Id,
                Status = "completed",
                Progress = 0,
                AddedAt = DateTime.UtcNow
            };

            db.UserBooks.Add(userBook);
            await db.SaveChangesAsync();

            return Results.Json(new
            {
                success = true,
                message = "Book added to completed books",
                book = new
                {
                    id = userBook.Id,
                    isbn = book.ISBN,
                    title = book.Title,
                    author = book.Author,
                    coverUrl = book.Cover
                }
            });
        });


        // PUT - Update progress tracking
        app.MapPut("/api/user/currently-reading/{id}/progress", async (
           HttpContext context,
           AppDbContext db,
           int id,
           UpdateProgressRequest request) =>
        {
            var userId = context.Session.GetString("UserId");

            if (string.IsNullOrEmpty(userId))
            {
                return Results.Json(new { success = false, message = "Unauthorized" }, statusCode: 401);
            }

            var userBook = await db.UserBooks
                .FirstOrDefaultAsync(ub =>
                    ub.Id == id &&
                    ub.UserId == int.Parse(userId) &&
                    ub.Status == "reading");

            if (userBook == null)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "Book not found"
                }, statusCode: 404);
            }

            userBook.Progress = Math.Clamp(request.Progress, 0, 100);

            // If completed, moved to completed
            if (userBook.Progress >= 100)
            {
                userBook.Status = "completed";
            }
            await db.SaveChangesAsync();

            return Results.Json(new
            {
                success = true,
                message = "Progress updated",
                progress = userBook.Progress,
                cmpleted = userBook.Status == "completed"
            });
        });

        // PUT - Mark book as complete by ISBN
        app.MapPut("/api/user/currently-reading/{isbn}/complete", async (
            HttpContext context,
            AppDbContext db,
            string isbn) =>
        {
            var userId = context.Session.GetString("UserId");

            if (string.IsNullOrEmpty(userId))
            {
                return Results.Json(new { success = false, message = "Unauthorized" }, statusCode: 401);
            }

            // Find the book by ISBN
            var book = await db.Books.FirstOrDefaultAsync(b => b.ISBN == isbn);
            if (book == null)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "Book not found"
                }, statusCode: 404);
            }

            // Find user's book entry
            var userBook = await db.UserBooks
                .FirstOrDefaultAsync(ub =>
                    ub.UserId == int.Parse(userId) &&
                    ub.BookId == book.Id &&
                    ub.Status == "reading");

            if (userBook == null)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "Book not found in your reading list"
                }, statusCode: 404);
            }

            // Mark as completed
            userBook.Status = "completed";
            userBook.Progress = 100;

            await db.SaveChangesAsync();

            return Results.Json(new
            {
                success = true,
                message = "Book marked as complete!",
                completed = true
            });
        });

        // DELETE - Remove book from Currently Reading
        app.MapDelete("/api/user/currently-reading/{id}", async (
            HttpContext context,
            AppDbContext db,
            int id) =>
        {
            var userId = context.Session.GetString("UserId");

            if (string.IsNullOrEmpty(userId))
            {
                return Results.Json(new { success = false, message = "Unauthorized" }, statusCode: 401);
            }

            var userBook = await db.UserBooks
                .FirstOrDefaultAsync(ub =>
                    ub.Id == id &&
                    ub.UserId == int.Parse(userId) &&
                    ub.Status == "reading");

            if (userBook == null)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "Book not found"
                }, statusCode: 404);
            }

            db.UserBooks.Remove(userBook);
            await db.SaveChangesAsync();

            return Results.Json(new
            {
                success = true,
                message = "Book removed from currently reading"
            });
        });

        // DELETE - Remove form Favourites
        app.MapDelete("/api/user/favorites/{id}", async (
            HttpContext context,
            AppDbContext db,
            int id) =>
        {
            var userId = context.Session.GetString("UserId");

            if (string.IsNullOrEmpty(userId))
            {
                return Results.Json(new { success = false, message = "Unauthorized" }, statusCode: 401);
            }

            var userBook = await db.UserBooks
                .FirstOrDefaultAsync(ub =>
                    ub.Id == id &&
                    ub.UserId == int.Parse(userId) &&
                    ub.Status == "favorite");

            if (userBook == null)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "Book not found"
                }, statusCode: 404);
            }

            db.UserBooks.Remove(userBook);
            await db.SaveChangesAsync();

            return Results.Json(new
            {
                success = true,
                message = "Book removed from favorites"
            });
        });

        // DELETE - Remove book from completed
        app.MapDelete("/api/user/completed/{id}", async (
            HttpContext context,
            AppDbContext db,
            int id) =>
        {
            var userId = context.Session.GetString("UserId");

            if (string.IsNullOrEmpty(userId))
            {
                return Results.Json(new { success = false, message = "Unauthorized" }, statusCode: 401);
            }

            var userBook = await db.UserBooks
                .FirstOrDefaultAsync(ub =>
                    ub.Id == id &&
                    ub.UserId == int.Parse(userId) &&
                    ub.Status == "completed");

            if (userBook == null)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "Book not found"
                }, statusCode: 404);
            }

            db.UserBooks.Remove(userBook);
            await db.SaveChangesAsync();

            return Results.Json(new
            {
                success = true,
                message = "Book removed from readed books"
            });
        });

        // GET - Check book status for current user
        app.MapGet("/api/user/book-status", async (
            HttpContext context,
            AppDbContext db,
            [Microsoft.AspNetCore.Mvc.FromQuery] int bookId) =>
        {
            var userId = context.Session.GetString("UserId");

            if (string.IsNullOrEmpty(userId))
            {
                return Results.Json(new { success = false, message = "Unauthorized" }, statusCode: 401);
            }

            var userBooks = await db.UserBooks
                .Where(ub => ub.UserId == int.Parse(userId) && ub.BookId == bookId)
                .ToListAsync();

            var status = new
            {
                isReading = userBooks.Any(ub => ub.Status == "reading"),
                isFavorite = userBooks.Any(ub => ub.Status == "favorite"),
                isCompleted = userBooks.Any(ub => ub.Status == "completed"),
                readingId = userBooks.FirstOrDefault(ub => ub.Status == "reading")?.Id,
                favoriteId = userBooks.FirstOrDefault(ub => ub.Status == "favorite")?.Id,
                completedId = userBooks.FirstOrDefault(ub => ub.Status == "completed")?.Id,
                progress = userBooks.FirstOrDefault(ub => ub.Status == "reading")?.Progress ?? 0
            };

            return Results.Json(status);
        });
    }
}


// REQUEST MODELS
public record AddBookByIdRequest(
    int BookId
);

public record AddBookByIsbnRequest(
    string Isbn
);

public record UpdateProgressRequest(
    int Progress
);

public record UpdateProgressByPageRequest(
    int CurrentPage
);