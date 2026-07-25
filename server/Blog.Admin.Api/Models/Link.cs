using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Blog.Admin.Api.Models;

/// <summary>A managed link/resource the blog can render (e.g. a curated list).</summary>
public sealed class Link
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    public string Title { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string? Description { get; set; }
    public string? Icon { get; set; }              // Font Awesome class or emoji.
    public int Order { get; set; }
    public bool Visible { get; set; } = true;      // Shown on the public blog.

    public string? CreatedByUserId { get; set; }
    public string? UpdatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
