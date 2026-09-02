using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Blog.Admin.Api.Content;
using Blog.Admin.Api.Data;
using Blog.Admin.Api.Dtos;
using Blog.Admin.Api.Models;
using KeshavSingh.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Blog.Admin.Api.Controllers;

/// <summary>
/// Reader comments on blog documents.
///
/// Reading a thread is public; writing is not. There are no anonymous comments: a commenter must
/// hold a valid access token from the identity provider, which they only have once an admin has
/// approved their account request. Approved commenters post straight to the page — moderation is
/// after the fact (hide, delete, ban) rather than a queue.
///
/// Bodies are stored and returned as plain text. Nothing here renders markup, and the blog binds the
/// text through Angular interpolation, so a comment cannot introduce HTML or script into a page.
/// </summary>
[ApiController]
[Route("api/comments")]
[Authorize] // Default-deny; the public read below opts out explicitly.
public sealed class CommentsController : ControllerBase
{
    /// <summary>How long an author may keep editing their own comment.</summary>
    private static readonly TimeSpan EditWindow = TimeSpan.FromMinutes(30);

    /// <summary>Cap on one page's thread, so a single document cannot return an unbounded response.</summary>
    private const int MaxThreadSize = 500;

    private readonly MongoContext _db;
    private readonly ILogger<CommentsController> _logger;

    public CommentsController(MongoContext db, ILogger<CommentsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>The visible thread for one document. Anonymous — reading the blog needs no account.</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<CommentThreadDto>> Thread([FromQuery] string path, CancellationToken ct)
    {
        if (!ContentPath.TryNormalize(path, out var contentPath))
            return BadRequest(new { error = "Unknown document path." });

        // A thread is displayed oldest-first, but an ascending sort with a limit would silently
        // drop the NEWEST comments once a thread exceeds MaxThreadSize. Query the newest tail
        // (descending, capped), then reverse into chronological display order — so a long thread
        // keeps its newest comments instead of losing them.
        var comments = await _db.Comments
            .Find(c => c.Path == contentPath && !c.IsHidden && !c.IsDeleted)
            .SortByDescending(c => c.CreatedAt)
            .Limit(MaxThreadSize)
            .ToListAsync(ct);
        comments.Reverse();

        // Report the true count of visible comments (not just how many we returned), so the client
        // can tell a long thread has more than the returned tail.
        var total = await _db.Comments
            .CountDocumentsAsync(c => c.Path == contentPath && !c.IsHidden && !c.IsDeleted, cancellationToken: ct);

        var callerId = CurrentUserId();
        var dtos = comments.Select(c => ToDto(c, callerId)).ToList();
        return Ok(new CommentThreadDto(contentPath, (int)total, dtos));
    }

    /// <summary>Post a comment. Requires a signed-in, non-banned account.</summary>
    [HttpPost]
    [EnableRateLimiting("comments")]
    public async Task<ActionResult<CommentDto>> Create(CreateCommentRequest request, CancellationToken ct)
    {
        if (!ContentPath.TryNormalize(request.Path, out var contentPath))
            return BadRequest(new { error = "Unknown document path." });

        var body = NormalizeBody(request.Body);
        if (body.Length < 2) return BadRequest(new { error = "Say a little more than that." });

        var userId = User.GetUserId();
        if (await IsBannedAsync(userId, ct))
        {
            // Logged as a security event: who was refused, and when. No comment text, no address.
            var safePathForLog = contentPath
                .Replace("\r", string.Empty, StringComparison.Ordinal)
                .Replace("\n", string.Empty, StringComparison.Ordinal);
            _logger.LogWarning("Comment rejected for banned user {UserId} on {Path} at {Timestamp:o}",
                userId, safePathForLog, DateTime.UtcNow);
            return StatusCode(StatusCodes.Status403Forbidden,
                new { error = "Commenting is disabled for this account." });
        }

        var comment = new Comment
        {
            Path = contentPath,
            UserId = userId,
            DisplayName = CurrentDisplayName(),
            Body = body,
        };
        await _db.Comments.InsertOneAsync(comment, cancellationToken: ct);

        return CreatedAtAction(nameof(Thread), new { path = contentPath }, ToDto(comment, userId));
    }

    /// <summary>Edit your own comment, for a short while after posting.</summary>
    [HttpPut("{id:objectid}")]
    public async Task<ActionResult<CommentDto>> Update(string id, UpdateCommentRequest request, CancellationToken ct)
    {
        var body = NormalizeBody(request.Body);
        if (body.Length < 2) return BadRequest(new { error = "Say a little more than that." });

        var userId = User.GetUserId();
        var comment = await _db.Comments.Find(c => c.Id == id && !c.IsDeleted).FirstOrDefaultAsync(ct);

        // One 404 for "no such comment" and "not yours": a probe must not be able to tell them apart.
        if (comment is null || comment.UserId != userId) return NotFound();

        // A banned account must not keep editing its comments.
        if (await IsBannedAsync(userId, ct))
            return StatusCode(StatusCodes.Status403Forbidden,
                new { error = "Commenting is disabled for this account." });

        if (DateTime.UtcNow - comment.CreatedAt > EditWindow)
            return StatusCode(StatusCodes.Status403Forbidden,
                new { error = "Comments can only be edited within 30 minutes of posting." });

        var now = DateTime.UtcNow;
        var updated = await _db.Comments.FindOneAndUpdateAsync<Comment>(
            c => c.Id == id && c.UserId == userId && !c.IsDeleted,
            Builders<Comment>.Update
                .Set(c => c.Body, body)
                .Set(c => c.EditedAt, now)
                .Set(c => c.UpdatedAt, now),
            new FindOneAndUpdateOptions<Comment> { ReturnDocument = ReturnDocument.After },
            ct);

        return updated is null ? NotFound() : Ok(ToDto(updated, userId));
    }

    /// <summary>Delete a comment — the author's own, or any comment if you are an admin.</summary>
    [HttpDelete("{id:objectid}")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        var userId = User.GetUserId();
        var isAdmin = User.IsInRole(Roles.Admin);

        var comment = await _db.Comments.Find(c => c.Id == id && !c.IsDeleted).FirstOrDefaultAsync(ct);
        if (comment is null || (!isAdmin && comment.UserId != userId)) return NotFound();

        // A banned account may not delete its own comments either (admins still moderate).
        if (!isAdmin && await IsBannedAsync(userId, ct))
            return StatusCode(StatusCodes.Status403Forbidden,
                new { error = "Commenting is disabled for this account." });

        // Soft delete, and the body goes: the row is kept for audit, the text is not needed for it.
        await _db.Comments.UpdateOneAsync(c => c.Id == id,
            Builders<Comment>.Update
                .Set(c => c.IsDeleted, true)
                .Set(c => c.Body, string.Empty)
                .Set(c => c.UpdatedAt, DateTime.UtcNow),
            cancellationToken: ct);

        if (isAdmin && comment.UserId != userId)
        {
            var safeCommentId = id.Replace("\r", string.Empty).Replace("\n", string.Empty);
            _logger.LogInformation("Comment {CommentId} on {Path} deleted by admin {AdminId} at {Timestamp:o}",
                safeCommentId, comment.Path, userId, DateTime.UtcNow);
        }

        return NoContent();
    }

    // ---- Moderation ----

    /// <summary>
    /// Every comment, including hidden and deleted ones, newest first. <paramref name="path"/> may
    /// be a whole document or just a folder ("CSharp"), which is what a moderator scanning a
    /// section actually wants to type.
    /// </summary>
    [HttpGet("moderation")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<IReadOnlyList<ModeratedCommentDto>>> Moderation(
        [FromQuery] string? path, [FromQuery] int limit = 100, CancellationToken ct = default)
    {
        var filter = Builders<Comment>.Filter.Empty;
        if (!string.IsNullOrWhiteSpace(path))
        {
            if (!ContentPath.TryNormalizeFilter(path, out var contentPath))
                return BadRequest(new { error = "Not a document or folder path." });
            // Escaped and anchored by ToFilterPattern, so the typed value cannot act as a regex.
            filter = Builders<Comment>.Filter.Regex(c => c.Path,
                new BsonRegularExpression(ContentPath.ToFilterPattern(contentPath)));
        }

        var comments = await _db.Comments.Find(filter)
            .SortByDescending(c => c.CreatedAt)
            .Limit(Math.Clamp(limit, 1, 500))
            .ToListAsync(ct);

        return Ok(comments.Select(c => new ModeratedCommentDto(
            c.Id, c.Path, c.UserId, c.DisplayName, c.Body, c.CreatedAt, c.EditedAt,
            c.IsHidden, c.IsDeleted, c.HiddenReason)).ToList());
    }

    /// <summary>Take a comment off the page without destroying it.</summary>
    [HttpPost("{id:objectid}/hide")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Hide(string id, HideCommentRequest request, CancellationToken ct)
    {
        var adminId = User.GetUserId();
        var result = await _db.Comments.UpdateOneAsync(c => c.Id == id,
            Builders<Comment>.Update
                .Set(c => c.IsHidden, true)
                .Set(c => c.HiddenByUserId, adminId)
                .Set(c => c.HiddenReason, string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim())
                .Set(c => c.UpdatedAt, DateTime.UtcNow),
            cancellationToken: ct);

        if (result.MatchedCount == 0) return NotFound();
        var safeCommentId = (id ?? string.Empty).Replace("\r", string.Empty).Replace("\n", string.Empty);
        _logger.LogInformation("Comment {CommentId} hidden by admin {AdminId} at {Timestamp:o}",
            safeCommentId, adminId, DateTime.UtcNow);
        return NoContent();
    }

    [HttpPost("{id:objectid}/unhide")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Unhide(string id, CancellationToken ct)
    {
        var result = await _db.Comments.UpdateOneAsync(c => c.Id == id,
            Builders<Comment>.Update
                .Set(c => c.IsHidden, false)
                .Set(c => c.HiddenByUserId, null)
                .Set(c => c.HiddenReason, null)
                .Set(c => c.UpdatedAt, DateTime.UtcNow),
            cancellationToken: ct);

        return result.MatchedCount == 0 ? NotFound() : NoContent();
    }

    // ---- Bans ----

    [HttpGet("bans")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<IReadOnlyList<CommentBanDto>>> Bans([FromQuery] int limit = 200, CancellationToken ct = default)
    {
        var bans = await _db.CommentBans.Find(Builders<CommentBan>.Filter.Empty)
            .SortByDescending(b => b.CreatedAt)
            .Limit(Math.Clamp(limit, 1, 1000)).ToListAsync(ct);
        return Ok(bans.Select(b => new CommentBanDto(b.UserId, b.DisplayName, b.Reason, b.CreatedAt)).ToList());
    }

    /// <summary>Bar a user from commenting. Their existing comments stay up until separately hidden.</summary>
    [HttpPost("bans")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<CommentBanDto>> Ban(CreateCommentBanRequest request, CancellationToken ct)
    {
        var userId = request.UserId.Trim();
        if (userId.Length == 0) return BadRequest(new { error = "A user id is required." });

        var adminId = User.GetUserId();
        if (userId == adminId) return BadRequest(new { error = "You cannot ban yourself." });

        // The display name is only ever a label here, taken from what that user last commented as.
        var displayName = await _db.Comments.Find(c => c.UserId == userId)
            .SortByDescending(c => c.CreatedAt)
            .Project(c => c.DisplayName)
            .FirstOrDefaultAsync(ct) ?? userId;

        var ban = new CommentBan
        {
            UserId = userId,
            DisplayName = displayName,
            Reason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim(),
            CreatedByUserId = adminId,
        };

        await _db.CommentBans.ReplaceOneAsync(b => b.UserId == userId, ban,
            new ReplaceOptions { IsUpsert = true }, ct);

        var logSafeUserId = userId.Replace("\r", "").Replace("\n", "");
        _logger.LogInformation("User {UserId} banned from commenting by admin {AdminId} at {Timestamp:o}",
            logSafeUserId, adminId, DateTime.UtcNow);

        return Ok(new CommentBanDto(ban.UserId, ban.DisplayName, ban.Reason, ban.CreatedAt));
    }

    [HttpDelete("bans/{userId}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Unban(string userId, CancellationToken ct)
    {
        var result = await _db.CommentBans.DeleteOneAsync(b => b.UserId == userId, ct);
        return result.DeletedCount == 0 ? NotFound() : NoContent();
    }

    // ---- Helpers ----

    private Task<bool> IsBannedAsync(string userId, CancellationToken ct) =>
        _db.CommentBans.Find(b => b.UserId == userId).AnyAsync(ct);

    /// <summary>The caller's id, or null when the request is anonymous (the public thread read).</summary>
    private string? CurrentUserId() =>
        User.Identity?.IsAuthenticated == true
            ? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
              ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            : null;

    /// <summary>The "name" claim minted by the identity provider, falling back to the email local part.</summary>
    private string CurrentDisplayName()
    {
        var name = User.FindFirst("name")?.Value;
        if (!string.IsNullOrWhiteSpace(name)) return name.Trim();

        var email = User.FindFirst(JwtRegisteredClaimNames.Email)?.Value;
        var local = email?.Split('@')[0];
        return string.IsNullOrWhiteSpace(local) ? "Reader" : local;
    }

    /// <summary>Trim, collapse runs of blank lines, and cap length. Never interprets the text.</summary>
    private static string NormalizeBody(string body)
    {
        var trimmed = body.Replace("\r\n", "\n").Trim();
        while (trimmed.Contains("\n\n\n", StringComparison.Ordinal))
            trimmed = trimmed.Replace("\n\n\n", "\n\n", StringComparison.Ordinal);
        return trimmed.Length > 4000 ? trimmed[..4000] : trimmed;
    }

    private static CommentDto ToDto(Comment c, string? callerId) => new(
        c.Id, c.Path, c.DisplayName, c.Body, c.CreatedAt, c.EditedAt,
        callerId is not null && c.UserId == callerId);
}
