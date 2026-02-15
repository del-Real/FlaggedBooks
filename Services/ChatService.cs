using Microsoft.AspNetCore.SignalR;

namespace FlaggedBooks.Services;

public class ChatService : Hub
{
    private readonly AppDbContext _context;
    private readonly ILogger<ChatService> _logger;

    public ChatService(AppDbContext context, ILogger<ChatService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var username = Context.GetHttpContext()?.Request.Query["username"].ToString();

        if (!string.IsNullOrEmpty(username))
        {
            _logger.LogInformation("{Username} connected (ConnectionId: {ConnectionId})",
                username, Context.ConnectionId);

            await Clients.Others.SendAsync("UserConnected", username);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var username = Context.GetHttpContext()?.Request.Query["username"].ToString();

        if (!string.IsNullOrEmpty(username))
        {
            _logger.LogInformation("{Username} disconnected", username);
            await Clients.Others.SendAsync("UserDisconnected", username);
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(string username, string message, int? chatId = null)
    {
        try
        {
            _logger.LogInformation("Received message from {Username}: {Message}", username, message);

            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(message))
            {
                _logger.LogWarning("Invalid message: empty username or message");
                throw new ArgumentException("Username and message are required");
            }

            var chatMessage = new ChatMessage
            {
                Username = username,
                Message = message,
                ChatId = chatId,
                SentAt = DateTime.UtcNow
            };

            _context.ChatMessages.Add(chatMessage);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Message saved with ID: {MessageId}", chatMessage.Id);

            // TO EVERYONE
            await Clients.All.SendAsync("ReceiveMessage", new
            {
                id = chatMessage.Id,
                username = chatMessage.Username,
                message = chatMessage.Message,
                sentAt = chatMessage.SentAt.ToString("HH:mm"),
                chatId = chatMessage.ChatId
            });

            _logger.LogInformation("Message broadcasted to all clients");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ERROR in SendMessage from {Username}", username);
            throw;
        }
    }

    public async Task UserTyping(string username)
    {
        await Clients.Others.SendAsync("UserIsTyping", username);
    }

    public async Task UserStoppedTyping(string username)
    {
        await Clients.Others.SendAsync("UserStoppedTyping", username);
    }
}