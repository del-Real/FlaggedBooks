using Microsoft.EntityFrameworkCore;
using FlaggedBooks.Services;

namespace FlaggedBooks.Extensions;

public static class ServiceExtensions
{
    public static IServiceCollection AddApplicationServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Database
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlite(configuration.GetConnectionString("DefaultConnection")));

        // Application Services
        services.AddScoped<AuthService>();

        services.AddSingleton<BookCacheService>();

        // HTTP Client for Open Library API
        services.AddHttpClient<BookService>(client =>
        {
            client.BaseAddress = new Uri("https://openlibrary.org/");
            client.DefaultRequestHeaders.Add("User-Agent", "FlaggedBooks/1.0");
        });

        // Session Configuration
        services.AddDistributedMemoryCache();
        services.AddSession(options =>
        {
            options.Cookie.Name = ".Admin.Session";
            options.IdleTimeout = TimeSpan.FromMinutes(30);
            options.Cookie.HttpOnly = true;
            options.Cookie.IsEssential = true;
        });

        // SignalR for LiveChat
        services.AddSignalR();

        return services;
    }
}