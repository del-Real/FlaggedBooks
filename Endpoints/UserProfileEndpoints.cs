using Microsoft.EntityFrameworkCore;

namespace FlaggedBooks.Endpoints;

public static class UserProfileEndpoints
{
    public static void MapUserProfileEndpoints(this WebApplication app)
    {
        // GET - Public user profile information
        app.MapGet("/api/users/{userId}/profile", async (
            AppDbContext db,
            int userId) =>
        {
            var user = await db.Users.FindAsync(userId);

            if (user == null)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "User not found"
                }, statusCode: 404);
            }

            // Return only public information
            return Results.Json(new
            {
                userId = user.Id,
                username = user.Username,
                role = user.Role,
                createdAt = user.CreatedAt
            });
        });

        // GET - Public view of user's currently reading books
        app.MapGet("/api/users/{userId}/currently-reading", async (
            AppDbContext db,
            int userId) =>
        {
            // Verify user exists
            var userExists = await db.Users.AnyAsync(u => u.Id == userId);
            if (!userExists)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "User not found"
                }, statusCode: 404);
            }

            var userBooks = await db.UserBooks
                .Include(ub => ub.Book)
                .Where(ub => ub.UserId == userId && ub.Status == "reading")
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

        // GET - Public view of user's favorite books
        app.MapGet("/api/users/{userId}/favorites", async (
            AppDbContext db,
            int userId) =>
        {
            // Verify user exists
            var userExists = await db.Users.AnyAsync(u => u.Id == userId);
            if (!userExists)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "User not found"
                }, statusCode: 404);
            }

            var userBooks = await db.UserBooks
                .Include(ub => ub.Book)
                .Where(ub => ub.UserId == userId && ub.Status == "favorite")
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

        // GET - Public view of user's joined lecture clubs
        app.MapGet("/api/users/{userId}/lecture-clubs", async (
            AppDbContext db,
            int userId) =>
        {
            // Verify user exists
            var userExists = await db.Users.AnyAsync(u => u.Id == userId);
            if (!userExists)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "User not found"
                }, statusCode: 404);
            }

            var userClubs = await db.UserLectureClubs
                .Include(ulc => ulc.LectureClub)
                .Include(ulc => ulc.Book)
                .Where(ulc => ulc.UserId == userId)
                .OrderByDescending(ulc => ulc.AddedAt)
                .ToListAsync();

            var result = userClubs.Select(ulc => new
            {
                id = ulc.Id,
                clubId = ulc.LectureClubId,
                clubTitle = ulc.LectureClub?.Title,
                clubGenre = ulc.LectureClub?.Genre,
                clubDescription = ulc.LectureClub?.Description,
                role = ulc.Role,
                bookId = ulc.BookId,
                bookTitle = ulc.Book?.Title,
                bookAuthor = ulc.Book?.Author,
                bookCover = ulc.Book?.Cover,
                joinedAt = ulc.AddedAt
            });

            return Results.Json(result);
        });

        // GET - Search users by username
        app.MapGet("/api/users/search", async (
            AppDbContext db,
            string? q) =>
        {
            if (string.IsNullOrWhiteSpace(q))
            {
                return Results.Json(new
                {
                    success = false,
                    message = "Search query is required"
                }, statusCode: 400);
            }

            var users = await db.Users
                .Where(u => u.Username.Contains(q))
                .Take(10)
                .Select(u => new
                {
                    userId = u.Id,
                    username = u.Username,
                    role = u.Role
                })
                .ToListAsync();

            return Results.Json(users);
        });

        // GET - Get user statistics
        app.MapGet("/api/users/{userId}/stats", async (
            AppDbContext db,
            int userId) =>
        {
            var userExists = await db.Users.AnyAsync(u => u.Id == userId);
            if (!userExists)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "User not found"
                }, statusCode: 404);
            }

            var currentlyReadingCount = await db.UserBooks
                .CountAsync(ub => ub.UserId == userId && ub.Status == "reading");

            var favoritesCount = await db.UserBooks
                .CountAsync(ub => ub.UserId == userId && ub.Status == "favorite");

            var lectureClubsCount = await db.UserLectureClubs
                .CountAsync(ulc => ulc.UserId == userId);

            return Results.Json(new
            {
                userId = userId,
                currentlyReading = currentlyReadingCount,
                favorites = favoritesCount,
                lectureClubs = lectureClubsCount,
                totalBooks = currentlyReadingCount + favoritesCount
            });
        });

        // GET - Get user's pending club invitations
        app.MapGet("/api/users/{userId}/invitations", async (
            AppDbContext db,
            int userId) =>
        {
            var invitations = await db.ClubInvitations
                .Where(i => i.InvitedUserId == userId && i.Status == "Pending")
                .Include(i => i.InvitedByUser)
                .Include(i => i.LectureClub)
                .OrderByDescending(i => i.InvitedAt)
                .Select(i => new
                {
                    id = i.Id,
                    clubId = i.LectureClubId,
                    clubTitle = i.LectureClub!.Title,
                    clubGenre = i.LectureClub.Genre,
                    invitedBy = i.InvitedByUser!.Username,
                    invitedAt = i.InvitedAt,
                    status = i.Status,
                    invitationCode = i.InvitationCode
                })
                .ToListAsync();

            return Results.Json(invitations);
        });

        // GET - Get user's clubs
        app.MapGet("/api/users/{userId}/clubs", async (
            AppDbContext db,
            int userId) =>
        {
            var clubs = await db.UserLectureClubs
                .Where(ulc => ulc.UserId == userId)
                .Include(ulc => ulc.LectureClub)
                .OrderByDescending(ulc => ulc.AddedAt)
                .Select(ulc => new
                {
                    id = ulc.LectureClub!.Id,
                    title = ulc.LectureClub.Title,
                    genre = ulc.LectureClub.Genre,
                    description = ulc.LectureClub.Description,
                    role = ulc.Role,
                    joinedAt = ulc.AddedAt
                })
                .ToListAsync();

            return Results.Json(clubs);
        });

    }
}