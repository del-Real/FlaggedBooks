using System.ComponentModel.DataAnnotations;
public class ChatMessage
{
    [Key]
    public int Id { get; set; }

    public int? ChatId { get; set; }
    
    [Required]
    public required string Username { get; set; }
    [Required]
    public required string Message { get; set; }
    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    public Book? Book { get; set; }

}