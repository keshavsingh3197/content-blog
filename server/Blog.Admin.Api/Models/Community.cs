using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Blog.Admin.Api.Models;

/// <summary>
/// A reader's comment on one document. Stored as plain text and rendered as plain text — the blog
/// never turns a comment into markup, so a comment cannot inject HTML or script into the page.
/// </summary>
public sealed class Comment
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    /// <summary>Content path of the document, validated by <c>ContentPath</c> before it is stored.</summary>
    public string Path { get; set; } = string.Empty;

    /// <summary>The identity provider's user id ("sub"). Comments are never anonymous.</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>Display name captured at post time, so the thread still reads correctly if it changes.</summary>
    public string DisplayName { get; set; } = string.Empty;

    public string Body { get; set; } = string.Empty;

    /// <summary>Set when the author has edited the comment, so the UI can say so.</summary>
    public DateTime? EditedAt { get; set; }

    /// <summary>Hidden by a moderator: kept for audit, not served to readers.</summary>
    public bool IsHidden { get; set; }
    public string? HiddenByUserId { get; set; }
    public string? HiddenReason { get; set; }

    /// <summary>Soft delete, whether by the author or a moderator. Body is cleared on delete.</summary>
    public bool IsDeleted { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// A user barred from commenting. Kept as its own record rather than a flag on the comment author so
/// the ban outlives any individual comment and survives their deletion.
/// </summary>
public sealed class CommentBan
{
    /// <summary>The banned user's identity-provider id — also the document id, so a ban is idempotent.</summary>
    [BsonId]
    public string UserId { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public string CreatedByUserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Running view total for one document. The id is the content path, so a view is one $inc.</summary>
public sealed class PageStat
{
    [BsonId]
    public string Path { get; set; } = string.Empty;

    public long Views { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// One (document, visitor) pair inside the de-duplication window. Its unique index is what makes a
/// view count a count of readers rather than a count of refreshes; a TTL index expires the rows so
/// the collection stays small and the same reader is counted again on a later day.
/// </summary>
public sealed class PageViewHit
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    public string Path { get; set; } = string.Empty;

    /// <summary>Salted hash of IP + user agent. Never the raw address — see WebsiteVisitService.</summary>
    public string VisitorKey { get; set; } = string.Empty;

    public DateTime SeenAt { get; set; } = DateTime.UtcNow;
}
