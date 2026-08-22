using System.ComponentModel.DataAnnotations;

namespace Blog.Admin.Api.Dtos;

// ---- Comments ----

/// <summary>What a reader sees. Deliberately omits the author's email and the moderation fields.</summary>
public sealed record CommentDto(
    string Id,
    string Path,
    string UserId,
    string DisplayName,
    string Body,
    DateTime CreatedAt,
    DateTime? EditedAt,
    // True when the signed-in caller wrote this comment, so the UI can offer edit/delete.
    bool IsMine);

/// <summary>The moderator's view: everything above plus why a comment is not on the page.</summary>
public sealed record ModeratedCommentDto(
    string Id,
    string Path,
    string UserId,
    string DisplayName,
    string Body,
    DateTime CreatedAt,
    DateTime? EditedAt,
    bool IsHidden,
    bool IsDeleted,
    string? HiddenReason);

public sealed record CommentThreadDto(string Path, int Count, IReadOnlyList<CommentDto> Comments);

public sealed record CreateCommentRequest(
    [Required, MaxLength(300)] string Path,
    [Required, MinLength(2), MaxLength(4000)] string Body);

public sealed record UpdateCommentRequest(
    [Required, MinLength(2), MaxLength(4000)] string Body);

public sealed record HideCommentRequest([MaxLength(400)] string? Reason);

// ---- Comment bans ----

public sealed record CommentBanDto(
    string UserId,
    string DisplayName,
    string? Reason,
    DateTime CreatedAt);

public sealed record CreateCommentBanRequest(
    [Required, MaxLength(64)] string UserId,
    [MaxLength(400)] string? Reason);

// ---- Page views ----

public sealed record PageStatDto(string Path, long Views);

public sealed record TrackPageViewRequest([Required, MaxLength(300)] string Path);
