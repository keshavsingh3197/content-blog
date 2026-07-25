using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Blog.Admin.Api.Models;

/// <summary>A managed content page/topic. Mirrors the markdown docs the blog renders.</summary>
public sealed class ContentTopic
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;         // URL-safe, unique within a folder.
    public string Folder { get; set; } = string.Empty;       // e.g. "CSharp" or "Azure/Certification".
    public string Body { get; set; } = string.Empty;         // Markdown source.
    public List<string> Tags { get; set; } = new();
    public int Order { get; set; }
    public bool Published { get; set; }

    public string? CreatedByUserId { get; set; }
    public string? UpdatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
