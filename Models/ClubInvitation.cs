using FlaggedBooks.Models;

public class ClubInvitation
{
    public int Id { get; set; }
    public int LectureClubId { get; set; }
    public int InvitedUserId { get; set; }
    public int InvitedByUserId { get; set; }
    public DateTime InvitedAt { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "Pending"; // "Pending", "Accepted", "Rejected"
    public string? InvitationCode { get; set; }
    // Navigation properties
    public LectureClub? LectureClub { get; set; }
    public User? InvitedUser { get; set; }
    public User? InvitedByUser { get; set; }
}
