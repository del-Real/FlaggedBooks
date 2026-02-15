
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FlaggedBooks.Models;

public class ClubBookProposal
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int LectureClubId { get; set; }

    [Required]
    public int ProposedByUserId { get; set; }
    public int? VotingSessionId { get; set; }
    [Required]
    [MaxLength(20)]
    public string ISBN { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Author { get; set; }

    [MaxLength(1000)]
    public string? CoverUrl { get; set; }

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "Active"; // Active, Closed, Selected

    public DateTime ProposedAt { get; set; }

    // Navigation properties
    [ForeignKey("LectureClubId")]
    public LectureClub? LectureClub { get; set; }

    [ForeignKey("ProposedByUserId")]
    public User? ProposedByUser { get; set; }

    public ICollection<ClubBookVote> Votes { get; set; } = new List<ClubBookVote>();
}