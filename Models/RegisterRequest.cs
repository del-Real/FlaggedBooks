using System.ComponentModel.DataAnnotations;

public class RegisterRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(3)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [MinLength(8)] // Consider 8+ for better security
    public string Password { get; set; } = string.Empty;

    [Required]
    [Compare(nameof(Password))] // Validates passwords match
    public string RepeatPassword { get; set; } = string.Empty;
}