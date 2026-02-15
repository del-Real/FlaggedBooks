using FlaggedBooks.Services;
using Microsoft.EntityFrameworkCore;
using FlaggedBooks.Models;

namespace FlaggedBooks.Endpoints;

public static class LectureClubEndpoints
{
    public static void MapLectureClubEndpoints(this WebApplication app)
    {
        // POST - Create a new lecture club
        app.MapPost("/api/lectureclubs", async (
            AppDbContext db,
            CreateLectureClubRequest request) =>
        {
            // Validate required fields
            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return Results.BadRequest(new { error = "Title is required" });
            }

            if (string.IsNullOrWhiteSpace(request.Genre))
            {
                return Results.BadRequest(new { error = "Genre is required" });
            }

            // Check if user exists
            var user = await db.Users.FindAsync(request.CreatedByUserId);
            if (user == null)
            {
                return Results.NotFound(new { error = "User not found" });
            }

            // Create the lecture club
            var newClub = new LectureClub
            {
                Title = request.Title.Trim(),
                Genre = request.Genre.Trim(),
                Description = request.Description?.Trim() ?? string.Empty,
                CoverImage = request.CoverImage,
                CreatedByUserId = request.CreatedByUserId,
                CreatedAt = DateTime.UtcNow
            };

            db.LectureClubs.Add(newClub);
            await db.SaveChangesAsync();

            // Automatically add creator as admin
            var creatorMembership = new UserLectureClub
            {
                LectureClubId = newClub.Id,
                UserId = request.CreatedByUserId,
                Role = "Admin",
                AddedAt = DateTime.UtcNow
            };

            db.UserLectureClubs.Add(creatorMembership);
            await db.SaveChangesAsync();

            return Results.Json(new
            {
                success = true,
                message = "Lecture club created successfully",
                club = new
                {
                    id = newClub.Id,
                    title = newClub.Title,
                    genre = newClub.Genre,
                    description = newClub.Description,
                    coverImage = newClub.CoverImage,
                    createdByUserId = newClub.CreatedByUserId,
                    createdAt = newClub.CreatedAt
                }
            });
        });

        // GET - Get all lecture clubs
        app.MapGet("/api/lectureclubs", async (AppDbContext db) =>
        {
            var lectureClubs = await db.LectureClubs
                .Include(lc => lc.CreatedBy)
                .Select(lc => new
                {
                    id = lc.Id,
                    title = lc.Title,
                    genre = lc.Genre,
                    description = lc.Description,
                    coverImage = lc.CoverImage,
                    createdBy = new
                    {
                        id = lc.CreatedByUserId,
                        username = lc.CreatedBy!.Username
                    },
                    createdAt = lc.CreatedAt
                })
                .ToListAsync();

            return Results.Json(lectureClubs);
        });

        // GET - Get lecture clubs grouped by genre
        app.MapGet("/api/lectureclubs/by-genre", async (AppDbContext db) =>
        {
            var clubsByGenre = await db.LectureClubs
                .Include(lc => lc.CreatedBy)
                .GroupBy(lc => lc.Genre)
                .Select(g => new
                {
                    genre = g.Key,
                    clubs = g.Select(lc => new
                    {
                        id = lc.Id,
                        title = lc.Title,
                        description = lc.Description,
                        coverImage = lc.CoverImage,
                        createdBy = new
                        {
                            id = lc.CreatedByUserId,
                            username = lc.CreatedBy!.Username
                        },
                        createdAt = lc.CreatedAt
                    }).ToList()
                })
                .ToListAsync();

            return Results.Json(clubsByGenre);
        });

        // GET - Get single lecture club by ID (UPDATED to include winner)
        app.MapGet("/api/lectureclubs/{id}", async (AppDbContext db, int id) =>
        {
            var club = await db.LectureClubs.FindAsync(id);

            if (club == null)
            {
                return Results.NotFound(new { error = "Lecture club not found" });
            }

            var userCount = await db.UserLectureClubs
                .Where(u => u.LectureClubId == id)
                .CountAsync();


            // Get the most recent closed voting session with winner
            var lastClosedSession = await db.VotingSessions
                .Where(v => v.LectureClubId == id &&
                            v.Status == "Closed" &&
                            v.WinningProposalId != null)
                .OrderByDescending(v => v.VotingClosedAt)
                .FirstOrDefaultAsync();

            object? currentBook = null;

            if (lastClosedSession != null && lastClosedSession.WinningProposalId.HasValue)
            {
                var winningProposal = await db.ClubBookProposals
                    .Where(p => p.Id == lastClosedSession.WinningProposalId.Value)
                    .FirstOrDefaultAsync();

                if (winningProposal != null)
                {
                    currentBook = new
                    {
                        isbn = winningProposal.ISBN,
                        title = winningProposal.Title,
                        author = winningProposal.Author,
                        coverUrl = winningProposal.CoverUrl,
                        selectedAt = lastClosedSession.VotingClosedAt
                    };
                }
            }

            return Results.Json(new
            {
                id = club.Id,
                title = club.Title,
                genre = club.Genre,
                description = club.Description,
                coverImage = club.CoverImage,
                createdAt = club.CreatedAt,
                userCount = userCount,
                currentBook = currentBook
            });
        });


        // POST - Join a lecture club
        app.MapPost("/api/lectureclubs/{id}/join", async (
            AppDbContext db,
            int id,
            JoinRequest? request) =>
        {
            int userId = request?.UserId ?? 1;

            Console.WriteLine($"Join request - ClubId: {id}, UserId: {userId}");

            var club = await db.LectureClubs.FindAsync(id);
            if (club == null)
            {
                return Results.NotFound(new { error = "Lecture club not found" });
            }

            var user = await db.Users.FindAsync(userId);
            if (user == null)
            {
                return Results.NotFound(new { error = $"User with ID {userId} not found" });
            }

            var existingUser = await db.UserLectureClubs
                .FirstOrDefaultAsync(u => u.LectureClubId == id && u.UserId == userId);

            if (existingUser != null)
            {
                return Results.BadRequest(new { error = "Already in this club" });
            }

            var newUser = new UserLectureClub
            {
                LectureClubId = id,
                UserId = userId,
                BookId = null,
                Role = "User",
                AddedAt = DateTime.UtcNow
            };

            db.UserLectureClubs.Add(newUser);
            await db.SaveChangesAsync();

            return Results.Json(new
            {
                success = true,
                message = "Successfully joined the club",
                user = new
                {
                    id = newUser.Id,
                    userId = newUser.UserId,
                    lectureClubId = newUser.LectureClubId,
                    role = newUser.Role,
                    joinedAt = newUser.AddedAt
                }
            });
        });


        // POST - Leave a lecture club
        app.MapPost("/api/lectureclubs/{clubId}/leave", async (
            AppDbContext db,
            int clubId,
            LeaveClubRequest request) =>
        {
            var userInClub = await db.UserLectureClubs
                .FirstOrDefaultAsync(u => u.LectureClubId == clubId && u.UserId == request.UserId);

            if (userInClub == null)
            {
                return Results.NotFound(new { error = "User not found in this club" });
            }

            db.UserLectureClubs.Remove(userInClub);
            await db.SaveChangesAsync();

            return Results.Json(new
            {
                success = true,
                message = "Successfully left the club"
            });
        });


        // POST - Invite user by email (generates invitation code)
        app.MapPost("/api/lectureclubs/{id}/invite", async (
            AppDbContext db,
            int id,
            HttpRequest request) =>
        {
            try
            {
                string requestBody;
                using (var reader = new StreamReader(request.Body))
                {
                    requestBody = await reader.ReadToEndAsync();
                }

                if (string.IsNullOrWhiteSpace(requestBody))
                {
                    return Results.BadRequest(new { error = "Request body is empty" });
                }

                // Parse JSON manually
                var jsonDoc = System.Text.Json.JsonDocument.Parse(requestBody);
                var root = jsonDoc.RootElement;

                string? email = root.TryGetProperty("email", out var emailProp)
                    ? emailProp.GetString()
                    : null;

                int invitedByUserId = root.TryGetProperty("invitedByUserId", out var userIdProp)
                    ? userIdProp.GetInt32()
                    : 0;

                // Validate email
                if (string.IsNullOrWhiteSpace(email))
                {
                    return Results.BadRequest(new { error = "Email is required" });
                }

                // Check if club exists
                var club = await db.LectureClubs.FindAsync(id);
                if (club == null)
                {
                    return Results.NotFound(new { error = "Lecture club not found" });
                }

                // Check if invited user exists
                var invitedUser = await db.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());

                if (invitedUser == null)
                {
                    return Results.NotFound(new { error = $"User not found with email: {email}" });
                }

                // Check if inviting user exists 
                if (invitedByUserId > 0)
                {
                    var invitingUser = await db.Users.FindAsync(invitedByUserId);
                    if (invitingUser == null)
                    {
                        invitedByUserId = 1; // Fallback to admin
                    }
                }
                else
                {
                    invitedByUserId = 1;
                }

                // Check if user is already a member
                var existingMember = await db.UserLectureClubs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.LectureClubId == id && u.UserId == invitedUser.Id);

                if (existingMember != null)
                {
                    return Results.BadRequest(new { error = "User is already in this club" });
                }

                // Check for existing pending invitation
                var existingInvite = await db.ClubInvitations
                    .AsNoTracking()
                    .FirstOrDefaultAsync(i => i.LectureClubId == id &&
                                            i.InvitedUserId == invitedUser.Id &&
                                            i.Status == "Pending");

                if (existingInvite != null)
                {
                    return Results.Json(new
                    {
                        success = true,
                        message = "User already has a pending invitation",
                        invitationCode = existingInvite.InvitationCode,
                        invitation = new
                        {
                            id = existingInvite.Id,
                            invitedUser = invitedUser.Username,
                            invitedUserEmail = invitedUser.Email,
                            status = existingInvite.Status
                        }
                    });
                }

                // Generate unique invitation code
                string invitationCode;
                int attempts = 0;
                do
                {
                    invitationCode = GenerateInvitationCode();
                    attempts++;

                    if (attempts > 10)
                    {
                        return Results.Problem("Could not generate unique invitation code");
                    }
                } while (await db.ClubInvitations.AnyAsync(i => i.InvitationCode == invitationCode));

                // Create invitation
                var invitation = new ClubInvitation
                {
                    LectureClubId = id,
                    InvitedUserId = invitedUser.Id,
                    InvitedByUserId = invitedByUserId,
                    Status = "Pending",
                    InvitedAt = DateTime.UtcNow,
                    InvitationCode = invitationCode
                };

                db.ClubInvitations.Add(invitation);

                await db.SaveChangesAsync();

                return Results.Json(new
                {
                    success = true,
                    message = $"Invitation sent to {invitedUser.Username}",
                    invitationCode = invitationCode,
                    invitation = new
                    {
                        id = invitation.Id,
                        invitedUser = invitedUser.Username,
                        invitedUserEmail = invitedUser.Email,
                        status = invitation.Status
                    }
                });
            }
            catch (DbUpdateException dbEx)
            {
                return Results.Problem($"Database error: {dbEx.InnerException?.Message ?? dbEx.Message}");
            }
            catch (Exception ex)
            {
                return Results.Problem($"Error processing invitation: {ex.Message}");
            }
        });


        // Generate unique and random code
        static string GenerateInvitationCode()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            var random = new Random();
            var parts = new string[2];

            for (int i = 0; i < 2; i++)
            {
                var part = new char[4];
                for (int j = 0; j < 4; j++)
                {
                    part[j] = chars[random.Next(chars.Length)];
                }
                parts[i] = new string(part);
            }

            return $"{parts[0]}-{parts[1]}";
        }

        // GET - Get pending invitations for current user in a club
        app.MapGet("/api/lectureclubs/{clubId}/invitations/{userId}", async (
            AppDbContext db,
            int clubId,
            int userId) =>
        {
            var invitations = await db.ClubInvitations
                .Where(i => i.LectureClubId == clubId &&
                        i.InvitedUserId == userId &&
                        i.Status == "Pending")
                .Include(i => i.InvitedByUser)
                .Include(i => i.LectureClub)
                .Select(i => new
                {
                    id = i.Id,
                    clubId = i.LectureClubId,
                    clubTitle = i.LectureClub!.Title,
                    invitedBy = i.InvitedByUser!.Username,
                    invitedAt = i.InvitedAt,
                    status = i.Status
                })
                .ToListAsync();

            return Results.Json(invitations);
        });

        // POST - Accept invitation
        app.MapPost("/api/lectureclubs/invitations/{invitationId}/accept", async (
            AppDbContext db,
            int invitationId) =>
        {
            var invitation = await db.ClubInvitations.FindAsync(invitationId);
            if (invitation == null)
            {
                return Results.NotFound(new { error = "Invitation not found" });
            }

            if (invitation.Status != "Pending")
            {
                return Results.BadRequest(new { error = "Invitation is not pending" });
            }

            // Add user to club
            var newUser = new UserLectureClub
            {
                LectureClubId = invitation.LectureClubId,
                UserId = invitation.InvitedUserId,
                BookId = null,
                Role = "User",
                AddedAt = DateTime.UtcNow
            };

            db.UserLectureClubs.Add(newUser);

            // Update status of invitation
            invitation.Status = "Accepted";

            await db.SaveChangesAsync();

            return Results.Json(new
            {
                success = true,
                message = "Invitation accepted! You are now a member of the club."
            });
        });

        // POST - Reject invitation
        app.MapPost("/api/lectureclubs/invitations/{invitationId}/reject", async (
            AppDbContext db,
            int invitationId) =>
        {
            var invitation = await db.ClubInvitations.FindAsync(invitationId);
            if (invitation == null)
            {
                return Results.NotFound(new { error = "Invitation not found" });
            }

            if (invitation.Status != "Pending")
            {
                return Results.BadRequest(new { error = "Invitation is not pending" });
            }

            invitation.Status = "Rejected";
            await db.SaveChangesAsync();

            return Results.Json(new
            {
                success = true,
                message = "Invitation rejected."
            });
        });

        // GET - Check if user is in club
        app.MapGet("/api/lectureclubs/{id}/membership/{userId}", async (
            AppDbContext db,
            int id,
            int userId) =>
        {
            var userInClub = await db.UserLectureClubs
                .FirstOrDefaultAsync(u => u.LectureClubId == id && u.UserId == userId);

            return Results.Json(new
            {
                isInClub = userInClub != null,
                role = userInClub?.Role,
                bookId = userInClub?.BookId,
                joinedAt = userInClub?.AddedAt
            });
        });

        // GET - Get all users in a club
        app.MapGet("/api/lectureclubs/{id}/users", async (
            AppDbContext db,
            int id) =>
        {
            var users = await db.UserLectureClubs
                .Where(u => u.LectureClubId == id)
                .Include(u => u.User)
                .Include(u => u.Book)
                .Select(u => new
                {
                    id = u.Id,
                    userId = u.UserId,
                    username = u.User!.Username,
                    email = u.User.Email,
                    role = u.Role,
                    bookId = u.BookId,
                    bookTitle = u.Book != null ? u.Book.Title : null,
                    joinedAt = u.AddedAt
                })
                .ToListAsync();

            return Results.Json(users);
        });

        // PUT - Update user's book in a club
        app.MapPut("/api/lectureclubs/{clubId}/users/{userId}/book", async (
            AppDbContext db,
            int clubId,
            int userId,
            UpdateBookRequest request) =>
        {
            var userInClub = await db.UserLectureClubs
                .FirstOrDefaultAsync(u => u.LectureClubId == clubId && u.UserId == userId);

            if (userInClub == null)
            {
                return Results.NotFound(new { error = "User not found in this club" });
            }

            var book = await db.Books.FindAsync(request.BookId);
            if (book == null)
            {
                return Results.NotFound(new { error = "Book not found" });
            }

            userInClub.BookId = request.BookId;
            await db.SaveChangesAsync();

            return Results.Json(new
            {
                success = true,
                message = "Book updated successfully",
                bookTitle = book.Title
            });
        });
        // GET - Validate club code and get club info
        app.MapGet("/api/lectureclubs/by-code/{code}", async (
            AppDbContext db,
            string code) =>
        {
            try
            {
                var decodedBytes = Convert.FromBase64String(code);
                var decodedId = System.Text.Encoding.UTF8.GetString(decodedBytes);

                if (!int.TryParse(decodedId, out int clubId))
                {
                    return Results.BadRequest(new { error = "Invalid code format" });
                }

                var club = await db.LectureClubs.FindAsync(clubId);

                if (club == null)
                {
                    return Results.NotFound(new { error = "Club not found with this code" });
                }

                var userCount = await db.UserLectureClubs
                    .Where(u => u.LectureClubId == clubId)
                    .CountAsync();

                return Results.Json(new
                {
                    success = true,
                    club = new
                    {
                        id = club.Id,
                        title = club.Title,
                        genre = club.Genre,
                        description = club.Description,
                        createdAt = club.CreatedAt,
                        userCount = userCount
                    }
                });
            }
            catch (FormatException)
            {
                return Results.BadRequest(new { error = "Invalid code format" });
            }
        });


        // GET - Get club invitation code
        app.MapGet("/api/lectureclubs/{id}/code", async (
            AppDbContext db,
            int id) =>
        {
            var club = await db.LectureClubs.FindAsync(id);

            if (club == null)
            {
                return Results.NotFound(new { error = "Club not found" });
            }

            var codeBytes = System.Text.Encoding.UTF8.GetBytes(id.ToString());
            var code = Convert.ToBase64String(codeBytes);

            return Results.Json(new
            {
                success = true,
                code = code,
                clubId = id
            });
        });

        // GET - Search club by invitation code
        app.MapGet("/api/lectureclubs/code/{code}", async (
            AppDbContext db,
            string code) =>
        {
            var invitation = await db.ClubInvitations
                .Include(i => i.LectureClub)
                .Include(i => i.InvitedByUser)
                .Include(i => i.InvitedUser)
                .FirstOrDefaultAsync(i => i.InvitationCode == code.ToUpper() && i.Status == "Pending");

            if (invitation == null)
            {
                return Results.Json(new
                {
                    success = false,
                    error = "Invalid or expired invitation code"
                });
            }

            return Results.Json(new
            {
                success = true,
                club = new
                {
                    id = invitation.LectureClubId,
                    title = invitation.LectureClub!.Title,
                    genre = invitation.LectureClub.Genre,
                    description = invitation.LectureClub.Description
                },
                invitation = new
                {
                    id = invitation.Id,
                    invitedBy = invitation.InvitedByUser!.Username,
                    invitedUser = invitation.InvitedUser!.Username,
                    invitedAt = invitation.InvitedAt
                }
            });
        });


        // GET - Get all books in a lecture club
        app.MapGet("/api/lectureclubs/{id}/books", async (
            AppDbContext db,
            int id) =>
        {
            var club = await db.LectureClubs.FindAsync(id);
            if (club == null)
            {
                return Results.NotFound(new { error = "Lecture club not found" });
            }

            var books = await db.LectureClubs
                .Where(lc => lc.Id == id)
                .SelectMany(lc => lc.Books)
                .Select(b => new
                {
                    id = b.Id,
                    title = b.Title,
                    author = b.Author,
                    cover = b.Cover
                })
                .ToListAsync();

            return Results.Json(new
            {
                success = true,
                clubId = id,
                bookCount = books.Count,
                books = books
            });
        });

        //POST - Start voting session
        app.MapPost("/api/lectureclubs/{clubId}/voting/start", async (
            AppDbContext db,
            int clubId,
            StartVotingRequest request) =>
        {
            var isMember = await db.UserLectureClubs
                .AnyAsync(u => u.LectureClubId == clubId && u.UserId == request.UserId);

            if (!isMember)
            {
                return Results.BadRequest(new { error = "You must be a member to start voting" });
            }

            var activeSession = await db.VotingSessions
                .FirstOrDefaultAsync(v => v.LectureClubId == clubId && v.Status != "Closed");

            if (activeSession != null)
            {
                return Results.BadRequest(new { error = "There is already an active voting session" });
            }

            var session = new VotingSession
            {
                LectureClubId = clubId,
                Status = "Proposing",
                Title = request.Title ?? "Book Selection",
                CreatedAt = DateTime.UtcNow
            };

            db.VotingSessions.Add(session);
            await db.SaveChangesAsync();

            return Results.Json(new
            {
                success = true,
                message = "Voting session started! Members can now propose books.",
                session = new
                {
                    id = session.Id,
                    status = session.Status,
                    title = session.Title
                }
            });
        });

        // GET - Get active voting session
        app.MapGet("/api/lectureclubs/{clubId}/voting/active", async (
            AppDbContext db,
            int clubId,
            int? userId) =>
        {
            var session = await db.VotingSessions
                .Where(v => v.LectureClubId == clubId && v.Status != "Closed")
                .Include(v => v.Proposals)
                    .ThenInclude(p => p.ProposedByUser)
                .Include(v => v.Proposals)
                    .ThenInclude(p => p.Votes)
                .FirstOrDefaultAsync();

            if (session == null)
            {
                return Results.Json(new { active = false });
            }

            int? userProposalId = null;
            if (userId.HasValue)
            {
                var userProposal = await db.ClubBookProposals
                    .Where(p => p.VotingSessionId == session.Id && p.ProposedByUserId == userId.Value)
                    .Select(p => p.Id)
                    .FirstOrDefaultAsync();

                userProposalId = userProposal > 0 ? userProposal : null;
            }

            int? userVoteProposalId = null;
            if (userId.HasValue && session.Status == "Voting")
            {
                var userVote = await db.ClubBookVotes
                    .Where(v => v.VotingSessionId == session.Id && v.UserId == userId.Value)
                    .Select(v => v.ProposalId)
                    .FirstOrDefaultAsync();

                userVoteProposalId = userVote > 0 ? userVote : null;
            }

            var proposals = session.Proposals.Select(p => new
            {
                id = p.Id,
                isbn = p.ISBN,
                title = p.Title,
                author = p.Author,
                coverUrl = p.CoverUrl,
                proposedBy = p.ProposedByUser?.Username,
                proposedByUserId = p.ProposedByUserId,
                voteCount = p.Votes.Count,
                status = p.Status
            }).ToList();

            return Results.Json(new
            {
                active = true,
                session = new
                {
                    id = session.Id,
                    status = session.Status,
                    title = session.Title,
                    createdAt = session.CreatedAt,
                    proposalCount = proposals.Count
                },
                proposals = proposals,
                userProposalId = userProposalId,
                userVoteProposalId = userVoteProposalId
            });
        });

        // PHASE 1
        // POST - Propose book from favorites
        app.MapPost("/api/lectureclubs/{clubId}/voting/propose", async (
            AppDbContext db,
            int clubId,
            ProposeBookRequest request) =>
        {
            var isMember = await db.UserLectureClubs
                .AnyAsync(u => u.LectureClubId == clubId && u.UserId == request.UserId);

            if (!isMember)
            {
                return Results.BadRequest(new { error = "You must be a member to propose books" });
            }

            var session = await db.VotingSessions
                .FirstOrDefaultAsync(v => v.LectureClubId == clubId && v.Status == "Proposing");

            if (session == null)
            {
                return Results.BadRequest(new { error = "There is no active voting session accepting proposals" });
            }

            var favoriteBook = await db.UserBooks
                .Include(ub => ub.Book)
                .FirstOrDefaultAsync(ub =>
                    ub.UserId == request.UserId &&
                    ub.Status == "favorite" &&
                    ub.Book!.ISBN == request.ISBN);

            if (favoriteBook == null)
            {
                return Results.BadRequest(new { error = "This book is not in your favorites" });
            }

            var existingProposal = await db.ClubBookProposals
                .FirstOrDefaultAsync(p =>
                    p.VotingSessionId == session.Id &&
                    p.ProposedByUserId == request.UserId);

            if (existingProposal != null)
            {
                existingProposal.ISBN = favoriteBook.Book!.ISBN;
                existingProposal.Title = favoriteBook.Book.Title;
                existingProposal.Author = favoriteBook.Book.Author;
                existingProposal.CoverUrl = favoriteBook.Book.Cover;
                existingProposal.ProposedAt = DateTime.UtcNow;

                await db.SaveChangesAsync();

                return Results.Json(new
                {
                    success = true,
                    message = "Your proposal has been updated!",
                    action = "updated",
                    proposal = new
                    {
                        id = existingProposal.Id,
                        isbn = existingProposal.ISBN,
                        title = existingProposal.Title
                    }
                });
            }

            var duplicateProposal = await db.ClubBookProposals
                .FirstOrDefaultAsync(p =>
                    p.VotingSessionId == session.Id &&
                    p.ISBN == request.ISBN);

            if (duplicateProposal != null)
            {
                return Results.BadRequest(new { error = "This book has already been proposed by another member" });
            }

            var proposal = new ClubBookProposal
            {
                LectureClubId = clubId,
                VotingSessionId = session.Id,
                ProposedByUserId = request.UserId,
                ISBN = favoriteBook.Book!.ISBN,
                Title = favoriteBook.Book.Title,
                Author = favoriteBook.Book.Author,
                CoverUrl = favoriteBook.Book.Cover,
                Status = "Active",
                ProposedAt = DateTime.UtcNow
            };

            db.ClubBookProposals.Add(proposal);
            await db.SaveChangesAsync();

            return Results.Json(new
            {
                success = true,
                message = "Book proposed successfully!",
                action = "created",
                proposal = new
                {
                    id = proposal.Id,
                    isbn = proposal.ISBN,
                    title = proposal.Title
                }
            });
        });


        // POST - Close proposing and open voting
        app.MapPost("/api/lectureclubs/{clubId}/voting/open-voting", async (
            AppDbContext db,
            int clubId,
            UserActionRequest request) =>
        {
            var isMember = await db.UserLectureClubs
                .AnyAsync(u => u.LectureClubId == clubId && u.UserId == request.UserId);

            if (!isMember)
            {
                return Results.BadRequest(new { error = "You must be a member to open voting" });
            }

            var session = await db.VotingSessions
                .Include(v => v.Proposals)
                .FirstOrDefaultAsync(v => v.LectureClubId == clubId && v.Status == "Proposing");

            if (session == null)
            {
                return Results.BadRequest(new { error = "No active proposing session found" });
            }

            if (session.Proposals.Count == 0)
            {
                return Results.BadRequest(new { error = "Cannot open voting with no proposals" });
            }

            session.Status = "Voting";
            session.ProposingClosedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return Results.Json(new
            {
                success = true,
                message = "Voting is now open!",
                proposalCount = session.Proposals.Count
            });
        });


        // Close voting and declare winner
        app.MapPost("/api/lectureclubs/{clubId}/voting/close", async (
            AppDbContext db,
            int clubId,
            UserActionRequest request) =>
        {
            var isMember = await db.UserLectureClubs
                .AnyAsync(u => u.LectureClubId == clubId && u.UserId == request.UserId);

            if (!isMember)
            {
                return Results.BadRequest(new { error = "You must be a member to close voting" });
            }

            var session = await db.VotingSessions
                .Include(v => v.Proposals)
                    .ThenInclude(p => p.Votes)
                .FirstOrDefaultAsync(v => v.LectureClubId == clubId && v.Status == "Voting");

            if (session == null)
            {
                return Results.BadRequest(new { error = "No active voting session found" });
            }

            if (session.Proposals.Count == 0)
            {
                return Results.BadRequest(new { error = "No proposals to determine a winner" });
            }

            // Get max vote count
            var maxVotes = session.Proposals.Max(p => p.Votes.Count);

            var topProposals = session.Proposals
                .Where(p => p.Votes.Count == maxVotes)
                .ToList();

            ClubBookProposal winningProposal;
            bool isTie = topProposals.Count > 1;

            if (isTie)
            {
                // In case of tie, pick the one proposed first
                winningProposal = topProposals.OrderBy(p => p.ProposedAt).First();
            }
            else
            {
                winningProposal = topProposals.First();
            }

            session.Status = "Closed";
            session.VotingClosedAt = DateTime.UtcNow;
            session.WinningProposalId = winningProposal.Id;

            winningProposal.Status = "Winner";

            await db.SaveChangesAsync();

            return Results.Json(new
            {
                success = true,
                message = isTie ? "Voting closed! Winner selected from tie." : "Voting closed!",
                winner = new
                {
                    id = winningProposal.Id,
                    title = winningProposal.Title,
                    author = winningProposal.Author,
                    voteCount = winningProposal.Votes.Count
                },
                wasTie = isTie,
                tiedProposalsCount = topProposals.Count
            });
        });

        // PHASE 2
        // POST - Vote for proposal
        app.MapPost("/api/lectureclubs/{clubId}/voting/vote", async (
            AppDbContext db,
            int clubId,
            VoteForProposalRequest request) =>
        {
            var isMember = await db.UserLectureClubs
                .AnyAsync(u => u.LectureClubId == clubId && u.UserId == request.UserId);

            if (!isMember)
            {
                return Results.BadRequest(new { error = "You must be a member to vote" });
            }

            var session = await db.VotingSessions
                .FirstOrDefaultAsync(v => v.LectureClubId == clubId && v.Status == "Voting");

            if (session == null)
            {
                return Results.BadRequest(new { error = "Voting is not open" });
            }

            var proposal = await db.ClubBookProposals
                .FirstOrDefaultAsync(p => p.Id == request.ProposalId && p.VotingSessionId == session.Id);

            if (proposal == null)
            {
                return Results.NotFound(new { error = "Proposal not found" });
            }

            var existingVote = await db.ClubBookVotes
                .FirstOrDefaultAsync(v => v.VotingSessionId == session.Id && v.UserId == request.UserId);

            if (existingVote != null)
            {
                if (existingVote.ProposalId == request.ProposalId)
                {
                    db.ClubBookVotes.Remove(existingVote);
                    await db.SaveChangesAsync();

                    var voteCount = await db.ClubBookVotes.CountAsync(v => v.ProposalId == request.ProposalId);

                    return Results.Json(new
                    {
                        success = true,
                        message = "Vote removed",
                        action = "removed",
                        voteCount = voteCount
                    });
                }
                else
                {
                    existingVote.ProposalId = request.ProposalId;
                    existingVote.VotedAt = DateTime.UtcNow;
                    await db.SaveChangesAsync();

                    var voteCount = await db.ClubBookVotes.CountAsync(v => v.ProposalId == request.ProposalId);

                    return Results.Json(new
                    {
                        success = true,
                        message = "Vote changed!",
                        action = "changed",
                        voteCount = voteCount
                    });
                }
            }

            var vote = new ClubBookVote
            {
                VotingSessionId = session.Id,
                ProposalId = request.ProposalId,
                UserId = request.UserId,
                VotedAt = DateTime.UtcNow
            };

            db.ClubBookVotes.Add(vote);
            await db.SaveChangesAsync();

            var newVoteCount = await db.ClubBookVotes.CountAsync(v => v.ProposalId == request.ProposalId);

            return Results.Json(new
            {
                success = true,
                message = "Vote registered!",
                action = "added",
                voteCount = newVoteCount
            });
        });

        // GET - Get club's reading list (books from closed voting sessions)
        app.MapGet("/api/lectureclubs/{clubId}/reading-list", async (
            AppDbContext db,
            int clubId) =>
        {
            var closedSessions = await db.VotingSessions
                .Where(v => v.LectureClubId == clubId &&
                            v.Status == "Closed" &&
                            v.WinningProposalId != null)
                .Include(v => v.WinningProposal)
                .OrderByDescending(v => v.VotingClosedAt)
                .ToListAsync();

            var readingList = closedSessions
                .Where(s => s.WinningProposal != null)
                .Select(s => new
                {
                    isbn = s.WinningProposal!.ISBN,
                    title = s.WinningProposal.Title,
                    author = s.WinningProposal.Author,
                    coverUrl = s.WinningProposal.CoverUrl,
                    selectedAt = s.VotingClosedAt
                })
                .ToList();

            return Results.Json(readingList);
        });

        // POST - Add winning book to all members' currently reading
        app.MapPost("/api/lectureclubs/{clubId}/add-winner-to-reading", async (
            HttpContext context,
            AppDbContext db,
            FlaggedBooks.Services.BookService bookService,
            int clubId,
            AddWinnerToReadingRequest request) =>
        {
            try
            {
                var winningProposal = await db.ClubBookProposals
                    .FirstOrDefaultAsync(p => p.Id == request.ProposalId);

                if (winningProposal == null)
                {
                    return Results.Json(new { success = false, message = "Proposal not found" }, statusCode: 404);
                }

                var book = await db.Books.FirstOrDefaultAsync(b => b.ISBN == winningProposal.ISBN);

                // In case it does not exist
                if (book == null)
                {
                    var bookData = await bookService.GetBookByISBNAsync(winningProposal.ISBN);

                    if (bookData == null)
                    {
                        // In case of not possible loading of book data
                        book = new Book
                        {
                            Title = winningProposal.Title,
                            Author = winningProposal.Author,
                            ISBN = winningProposal.ISBN,
                            Description = "",
                            Cover = winningProposal.CoverUrl,
                            CreatedAt = DateTime.UtcNow
                        };
                    }
                    else
                    {
                        book = new Book
                        {
                            Title = bookData.Title,
                            Author = string.Join(", ", bookData.Authors),
                            ISBN = bookData.ISBN,
                            Description = bookData.Description,
                            Cover = bookData.CoverUrl,
                            CreatedAt = DateTime.UtcNow
                        };
                    }

                    db.Books.Add(book);
                    await db.SaveChangesAsync();
                }

                // Add to currently reading
                var members = await db.UserLectureClubs
                    .Where(m => m.LectureClubId == clubId)
                    .ToListAsync();

                int addedCount = 0;
                int skippedCount = 0;

                foreach (var member in members)
                {
                    // Verify
                    var existingBook = await db.UserBooks
                        .FirstOrDefaultAsync(ub =>
                            ub.UserId == member.UserId &&
                            ub.BookId == book.Id &&
                            ub.Status == "reading");

                    if (existingBook == null)
                    {
                        var userBook = new UserBook
                        {
                            UserId = member.UserId,
                            BookId = book.Id,
                            Status = "reading",
                            Progress = 0,
                            AddedAt = DateTime.UtcNow
                        };

                        db.UserBooks.Add(userBook);
                        addedCount++;
                    }
                    else
                    {
                        skippedCount++;
                    }
                }

                await db.SaveChangesAsync();

                return Results.Json(new
                {
                    success = true,
                    message = "Book added to all members' reading lists",
                    addedToMembers = addedCount,
                    alreadyInList = skippedCount,
                    totalMembers = members.Count
                });
            }
            catch (Exception ex)
            {
                return Results.Json(new
                {
                    success = false,
                    message = $"Error: {ex.Message}"
                }, statusCode: 500);
            }
        });

    }

    // REQUEST MODELS
    public record CreateLectureClubRequest(
        string Title,
        string Genre,
        string? Description,
        string? CoverImage,
        int CreatedByUserId);
    public record InviteRequest(string Email, int InvitedByUserId);
    public record UpdateBookRequest(int BookId);
    public record JoinRequest(int UserId);
    public record LeaveClubRequest(int UserId);
    public record InviteUserRequest(string Email, int InvitedByUserId);
    public record ProposeBookRequest(int UserId, string ISBN);
    public record VoteRequest(int UserId);
    public record StartVotingRequest(int UserId, string? Title);
    public record VoteForProposalRequest(int UserId, int ProposalId);
    public record UserActionRequest(int UserId);
    public record AddWinnerToReadingRequest(int ProposalId);

}