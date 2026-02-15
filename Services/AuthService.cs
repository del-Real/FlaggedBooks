using Microsoft.EntityFrameworkCore;

namespace FlaggedBooks.Services;

public class AuthService
{
    private readonly AppDbContext _context;
    private readonly ILogger<AuthService> _logger;

    public AuthService(AppDbContext context, ILogger<AuthService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<LoginResponse> LoginAsync(string username, string password)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            {
                return new LoginResponse
                {
                    Success = false,
                    Message = "Username and password required"
                };
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);

            if (user == null)
            {
                _logger.LogWarning("Login with no real user: {Username}", username);
                return new LoginResponse { Success = false, Message = "User or password incorrect" };
            }

            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);

            if (!isPasswordValid)
            {
                _logger.LogWarning("Wrong user password: {Username}", username);
                return new LoginResponse { Success = false, Message = "Usuario o contraseña incorrectos" };
            }

            _logger.LogInformation("Succesful Login: {Username}", username);

            return new LoginResponse
            {
                Success = true,
                Message = "Succesful Login",
                Username = user.Username,
                Role = user.Role,
                UserId = user.Id
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while loading {Username}", username);
            return new LoginResponse { Success = false, Message = "Internal error of the server" };
        }
    }
}