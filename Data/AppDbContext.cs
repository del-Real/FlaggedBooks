using FlaggedBooks.Models;
using Microsoft.EntityFrameworkCore;

// This class is the bridge between C# code and the database
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Book> Books { get; set; }
    public DbSet<ChatMessage> ChatMessages { get; set; }
    public DbSet<UserBook> UserBooks { get; set; }
    public DbSet<LectureClub> LectureClubs { get; set; }
    public DbSet<UserLectureClub> UserLectureClubs { get; set; }
    public DbSet<ClubInvitation> ClubInvitations { get; set; }
    public DbSet<VotingSession> VotingSessions { get; set; }
    public DbSet<ClubBookProposal> ClubBookProposals { get; set; }
    public DbSet <ClubBookVote> ClubBookVotes { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Make username unique
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        modelBuilder.Entity<UserBook>()
            .HasOne(ub => ub.User)
            .WithMany()  // One user can have many UserBook records
            .HasForeignKey(ub => ub.UserId)
            .OnDelete(DeleteBehavior.Cascade); // If a user is deleted, all their related UserBook records are deleted too

        modelBuilder.Entity<UserBook>()
           .HasOne(ub => ub.Book)
           .WithMany() // One book can appear in many UserBooks
           .HasForeignKey(ub => ub.BookId)
           .OnDelete(DeleteBehavior.Cascade); // If a Book is deleted, all related UserBook entries are deleted too

        modelBuilder.Entity<UserBook>()
            .HasIndex(ub => new { ub.UserId, ub.BookId, ub.Status })
            .IsUnique(); // Create unique combination constraint on (UserId, BookId, Status)

        modelBuilder.Entity<ClubInvitation>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.LectureClub)
                .WithMany()
                .HasForeignKey(e => e.LectureClubId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.InvitedUser)
                .WithMany()
                .HasForeignKey(e => e.InvitedUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.InvitedByUser)
                .WithMany()
                .HasForeignKey(e => e.InvitedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.InvitationCode)
                .IsUnique();
        });

        // LectureClub configuration
        modelBuilder.Entity<LectureClub>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.CreatedBy)
                .WithMany()
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}