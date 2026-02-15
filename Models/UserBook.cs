namespace FlaggedBooks.Models
{
    public class UserBook
    {
        public int Id { get; set; }
        public int UserId { get; set; } // Clave foránea
        public int BookId { get; set; }  // Clave foránea
        public string Status { get; set; } = string.Empty;
        public int Progress { get; set; }
        public DateTime AddedAt { get; set; }

        // Relaciones
        public User? User { get; set; }
        public Book? Book { get; set; } 
    }
}
