using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class ClubBookVote
{
    [Key]
    public int Id { get; set; }
    [Required]
    public int ProposalId { get; set; }
    [Required]
    public int UserId { get; set; }

    public DateTime VotedAt { get; set; }

    public int? VotingSessionId { get; set; }
    // Navigation properties
    [ForeignKey("ProposalId")]
    public ClubBookProposal? Proposal { get; set; }

    [ForeignKey("UserId")]
    public User? User { get; set; }
}
