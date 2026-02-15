using Microsoft.EntityFrameworkCore;

namespace FlaggedBooks.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        // POST - User login
        app.MapPost("/api/login", async (HttpContext context, AppDbContext db) =>
        {
            var loginRequest = await context.Request.ReadFromJsonAsync<LoginRequest>();

            if (loginRequest == null || string.IsNullOrEmpty(loginRequest.Username))
            {
                return Results.BadRequest(new { success = false, message = "Invalid request" });
            }

            var user = await db.Users.FirstOrDefaultAsync(u => u.Username == loginRequest.Username);

            if (user == null)
            {
                return Results.Json(new { success = false, message = "Invalid username or password" });
            }

            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(loginRequest.Password, user.PasswordHash);

            if (isPasswordValid)
            {
                context.Session.SetString("IsAuthenticated", "true");
                context.Session.SetString("Username", user.Username);
                context.Session.SetString("UserId", user.Id.ToString());
                context.Session.SetString("Role", user.Role);

                return Results.Json(new
                {
                    success = true,
                    message = "Login successful",
                    username = user.Username,
                    userId = user.Id,
                    role = user.Role
                });
            }
            else
            {
                return Results.Json(new { success = false, message = "Invalid username or password" });
            }
        });

        // POST - Register user
        app.MapPost("/api/register", async (HttpContext context, AppDbContext db) =>
        {
            var registerRequest = await context.Request.ReadFromJsonAsync<RegisterRequest>();

            if (registerRequest == null ||
                string.IsNullOrEmpty(registerRequest.Username) ||
                string.IsNullOrEmpty(registerRequest.Password) ||
                string.IsNullOrEmpty(registerRequest.RepeatPassword) ||
                string.IsNullOrEmpty(registerRequest.Email))
            {
                return Results.BadRequest(new { success = false, message = "Invalid request" });
            }

            if (registerRequest.Password != registerRequest.RepeatPassword)
            {
                return Results.Json(new { success = false, message = "Passwords do not match" });
            }

            bool userExists = await db.Users.AnyAsync(u => u.Username == registerRequest.Username);
            if (userExists)
            {
                return Results.Json(new { success = false, message = "Username or email already taken" });
            }

            if (registerRequest.Username.Length < 3)
            {
                return Results.BadRequest(new
                {
                    success = false,
                    message = "Username must be at least 3 characters long"
                });
            }

            if (registerRequest.Password.Length < 5)
            {
                return Results.BadRequest(new
                {
                    success = false,
                    message = "Password must be at least 5 characters long"
                });
            }

            var newUser = new User
            {
                Username = registerRequest.Username,
                Email = registerRequest.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(registerRequest.Password),
                Role = "User",
                CreatedAt = DateTime.UtcNow
            };

            db.Users.Add(newUser);
            await db.SaveChangesAsync();

            Console.WriteLine($"New user registered: {newUser.Username}");

            context.Session.SetString("IsAuthenticated", "true");
            context.Session.SetString("Username", newUser.Username);
            context.Session.SetString("UserId", newUser.Id.ToString());
            context.Session.SetString("Role", newUser.Role);

            return Results.Json(new RegisterResponse
            {
                Success = true,
                Message = "Registration successful",
                Username = newUser.Username,
                Role = newUser.Role
            });
        });

        // GET - Check authentication (returns userId)
        app.MapGet("/api/check-auth", (HttpContext context) =>
        {
            var isAuthenticated = context.Session.GetString("IsAuthenticated");
            var userIdStr = context.Session.GetString("UserId");

            if (isAuthenticated == "true" && !string.IsNullOrEmpty(userIdStr))
            {
                return Results.Json(new
                {
                    isAuthenticated = true,
                    userId = int.Parse(userIdStr),
                    username = context.Session.GetString("Username"),
                    role = context.Session.GetString("Role")
                });
            }
            else
            {
                return Results.Json(new { isAuthenticated = false });
            }
        });

        // POST - User logout
        app.MapPost("/api/logout", (HttpContext context) =>
        {
            context.Session.Clear();
            return Results.Json(new { success = true, message = "Logged out successfully" });
        });

        // GET - Current authenticated user
        app.MapGet("/api/auth/current-user", async (HttpContext context, AppDbContext db) =>
        {
            var userIdStr = context.Session.GetString("UserId");

            if (string.IsNullOrEmpty(userIdStr))
            {
                return Results.Unauthorized();
            }

            if (!int.TryParse(userIdStr, out int userId))
            {
                return Results.Unauthorized();
            }

            var user = await db.Users.FindAsync(userId);

            if (user == null)
            {
                return Results.Unauthorized();
            }

            return Results.Json(new
            {
                userId = user.Id,
                username = user.Username,
                email = user.Email
            });
        });
    }
}