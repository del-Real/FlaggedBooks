using FlaggedBooks.Services;
using Microsoft.EntityFrameworkCore;

namespace FlaggedBooks.Endpoints;
public static class ChatEndpoints
{
    public static void MapChatEndpoints(this WebApplication app)
    {
        // GET - Chat history with membership validation
        app.MapGet("/api/chat/history", async (
            HttpContext context,
            AppDbContext db, 
            int? chatId, 
            int limit = 50) =>
        {
            try
            {
                // If it's a club chat, validate membership
                if (chatId.HasValue)
                {
                    var userId = context.Session.GetString("UserId");
                    
                    if (string.IsNullOrEmpty(userId))
                    {
                        return Results.Json(new { 
                            success = false, 
                            error = "Unauthorized" 
                        }, statusCode: 401);
                    }

                    // Check if user is a member of the club
                    var isMember = await db.UserLectureClubs
                        .AnyAsync(u => u.LectureClubId == chatId.Value && 
                                u.UserId == int.Parse(userId));

                    if (!isMember)
                    {
                        return Results.Json(new { 
                            success = false, 
                            error = "You must be a member to access this chat" 
                        }, statusCode: 403);
                    }
                }

                var query = db.ChatMessages.AsQueryable();

                if (chatId.HasValue)
                {
                    query = query.Where(m => m.ChatId == chatId.Value);
                }
                else
                {
                    query = query.Where(m => m.ChatId == null);
                }

                var messages = await query
                    .OrderByDescending(m => m.SentAt)
                    .Take(limit)
                    .OrderBy(m => m.SentAt)
                    .Select(m => new
                    {
                        id = m.Id,
                        username = m.Username,
                        message = m.Message,
                        sentAt = m.SentAt.ToString("HH:mm"),
                        chatId = m.ChatId
                    })
                    .ToListAsync();

                Console.WriteLine($"Retrieved {messages.Count} messages from chat {chatId?.ToString() ?? "general"}");

                return Results.Json(messages);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading chat history: {ex.Message}");
                return Results.Json(new { 
                    success = false, 
                    error = ex.Message 
                }, statusCode: 500);
            }
        });

        // SignalR Hub mapping
        app.MapHub<ChatService>("/chatHub");
    }
}