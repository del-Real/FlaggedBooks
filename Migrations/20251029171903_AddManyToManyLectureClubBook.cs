using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FlaggedBooks.Migrations
{
    /// <inheritdoc />
    public partial class AddManyToManyLectureClubBook : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserBooks_UserId",
                table: "UserBooks");

            migrationBuilder.DropColumn(
                name: "Genre",
                table: "Books");

            migrationBuilder.CreateTable(
                name: "LectureClubs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Genre = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LectureClubs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BookLectureClub",
                columns: table => new
                {
                    BooksId = table.Column<int>(type: "INTEGER", nullable: false),
                    LectureClubsId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BookLectureClub", x => new { x.BooksId, x.LectureClubsId });
                    table.ForeignKey(
                        name: "FK_BookLectureClub_Books_BooksId",
                        column: x => x.BooksId,
                        principalTable: "Books",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BookLectureClub_LectureClubs_LectureClubsId",
                        column: x => x.LectureClubsId,
                        principalTable: "LectureClubs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ClubInvitations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    LectureClubId = table.Column<int>(type: "INTEGER", nullable: false),
                    InvitedUserId = table.Column<int>(type: "INTEGER", nullable: false),
                    InvitedByUserId = table.Column<int>(type: "INTEGER", nullable: false),
                    InvitedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    InvitationCode = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClubInvitations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClubInvitations_LectureClubs_LectureClubId",
                        column: x => x.LectureClubId,
                        principalTable: "LectureClubs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClubInvitations_Users_InvitedByUserId",
                        column: x => x.InvitedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClubInvitations_Users_InvitedUserId",
                        column: x => x.InvitedUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserLectureClubs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    LectureClubId = table.Column<int>(type: "INTEGER", nullable: false),
                    BookId = table.Column<int>(type: "INTEGER", nullable: true),
                    AddedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Role = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserLectureClubs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserLectureClubs_Books_BookId",
                        column: x => x.BookId,
                        principalTable: "Books",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_UserLectureClubs_LectureClubs_LectureClubId",
                        column: x => x.LectureClubId,
                        principalTable: "LectureClubs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserLectureClubs_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserBooks_UserId_BookId_Status",
                table: "UserBooks",
                columns: new[] { "UserId", "BookId", "Status" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BookLectureClub_LectureClubsId",
                table: "BookLectureClub",
                column: "LectureClubsId");

            migrationBuilder.CreateIndex(
                name: "IX_ClubInvitations_InvitationCode",
                table: "ClubInvitations",
                column: "InvitationCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClubInvitations_InvitedByUserId",
                table: "ClubInvitations",
                column: "InvitedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ClubInvitations_InvitedUserId",
                table: "ClubInvitations",
                column: "InvitedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ClubInvitations_LectureClubId",
                table: "ClubInvitations",
                column: "LectureClubId");

            migrationBuilder.CreateIndex(
                name: "IX_UserLectureClubs_BookId",
                table: "UserLectureClubs",
                column: "BookId");

            migrationBuilder.CreateIndex(
                name: "IX_UserLectureClubs_LectureClubId",
                table: "UserLectureClubs",
                column: "LectureClubId");

            migrationBuilder.CreateIndex(
                name: "IX_UserLectureClubs_UserId",
                table: "UserLectureClubs",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BookLectureClub");

            migrationBuilder.DropTable(
                name: "ClubInvitations");

            migrationBuilder.DropTable(
                name: "UserLectureClubs");

            migrationBuilder.DropTable(
                name: "LectureClubs");

            migrationBuilder.DropIndex(
                name: "IX_UserBooks_UserId_BookId_Status",
                table: "UserBooks");

            migrationBuilder.AddColumn<string>(
                name: "Genre",
                table: "Books",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_UserBooks_UserId",
                table: "UserBooks",
                column: "UserId");
        }
    }
}
