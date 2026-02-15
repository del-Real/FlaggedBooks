using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FlaggedBooks.Models;

public class VotingSession
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int LectureClubId { get; set; }

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "Proposing"; // Proposing, Voting, Closed

    [MaxLength(500)]
    public string? Title { get; set; } = "Book Selection";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ProposingClosedAt { get; set; }

    public DateTime? VotingClosedAt { get; set; }

    public int? WinningProposalId { get; set; }

    // Navigation properties
    [ForeignKey("LectureClubId")]
    public LectureClub? LectureClub { get; set; }

    [ForeignKey("WinningProposalId")]
    public ClubBookProposal? WinningProposal { get; set; }

    public ICollection<ClubBookProposal> Proposals { get; set; } = new List<ClubBookProposal>();
}