using FlaggedBooks.Models;

public class UserLectureClub
{
    public int Id { get; set; }
    public int UserId { get; set; } // FK
    public int LectureClubId { get; set; } // FK
    public int? BookId { get; set; }  // FK - NULLABLE 
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    public string Role { get; set; } = "User"; // User, Admin, Editor...

    // Relations
    public User? User { get; set; }
    public LectureClub? LectureClub { get; set; }
    public Book? Book { get; set; }
}
