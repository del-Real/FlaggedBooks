using FlaggedBooks.Services;
using Microsoft.EntityFrameworkCore;
using FlaggedBooks.Models;

namespace FlaggedBooks.Extensions;

public static class DatabaseExtensions
{
    public static async Task InitializeDatabaseAsync(this WebApplication app)
    {
        try
        {
            using var scope = app.Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            await dbContext.Database.EnsureCreatedAsync();
            Console.WriteLine("Database ensured/created.");

            // Seed default admin user
            if (!dbContext.Users.Any())
            {
                dbContext.Users.Add(new User
                {
                    Username = "admin",
                    Email = "admin@flaggedbooks.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin"),
                    Role = "Admin",
                    CreatedAt = DateTime.UtcNow
                });

                dbContext.Users.Add(new User
                {
                    Username = "user",
                    Email = "user@flaggedbooks.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("user1"),
                    Role = "User",
                    CreatedAt = DateTime.UtcNow
                });

                await dbContext.SaveChangesAsync();
                Console.WriteLine("Default users created successfully.\n");
            }

            // Lecture clubs are now created dynamically by users
            Console.WriteLine("Lecture clubs will be created dynamically by users.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error initializing database: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            throw;
        }
    }
}