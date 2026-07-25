using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Blog.Admin.Api.Models;

/// <summary>Metadata for an uploaded media file. Bytes live on disk under the media store.</summary>
public sealed class MediaAsset
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    public string FileName { get; set; } = string.Empty;      // Sanitised display name.
    public string StoredName { get; set; } = string.Empty;    // Random on-disk name (no user input).
    public string ContentType { get; set; } = string.Empty;
    public long Size { get; set; }
    public string? UploadedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
