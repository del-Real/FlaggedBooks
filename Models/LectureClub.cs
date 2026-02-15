using System;

namespace FlaggedBooks.Models
{
    public class LectureClub
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Genre { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? CoverImage { get; set; }
        public int CreatedByUserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public User? CreatedBy { get; set; }

        public ICollection<Book> Books { get; set; } = new List<Book>();

    }
}