using Blog.Admin.Api.Configuration;
using Blog.Admin.Api.Models;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Blog.Admin.Api.Data;

/// <summary>Central access point for the MongoDB collections used by the admin API.</summary>
public sealed class MongoContext
{
    public IMongoCollection<User> Users { get; }
    public IMongoCollection<ContentTopic> Content { get; }
    public IMongoCollection<MediaAsset> Media { get; }
    public IMongoCollection<LoginAudit> Audit { get; }
    public IMongoCollection<RefreshToken> RefreshTokens { get; }
    public IMongoCollection<Link> Links { get; }
    public IMongoCollection<AppSettings> Settings { get; }

    public MongoContext(MongoDbService db)
    {
        Users = db.GetCollection<User>("users");
        Content = db.GetCollection<ContentTopic>("content");
        Media = db.GetCollection<MediaAsset>("media");
        Audit = db.GetCollection<LoginAudit>("audit");
        RefreshTokens = db.GetCollection<RefreshToken>("refresh_tokens");
        Links = db.GetCollection<Link>("links");
        Settings = db.GetCollection<AppSettings>("settings");

        EnsureIndexes();
    }

    private void EnsureIndexes()
    {
        Users.Indexes.CreateOne(new CreateIndexModel<User>(
            Builders<User>.IndexKeys.Ascending(u => u.Email),
            new CreateIndexOptions { Unique = true, Name = "ux_user_email" }));

        // Unique username, but only enforced on documents that actually have one.
        Users.Indexes.CreateOne(new CreateIndexModel<User>(
            Builders<User>.IndexKeys.Ascending(u => u.Username),
            new CreateIndexOptions<User>
            {
                Unique = true,
                Name = "ux_user_username",
                PartialFilterExpression = Builders<User>.Filter.Type(u => u.Username!, BsonType.String),
            }));

        Content.Indexes.CreateOne(new CreateIndexModel<ContentTopic>(
            Builders<ContentTopic>.IndexKeys.Ascending(c => c.Folder).Ascending(c => c.Slug),
            new CreateIndexOptions { Unique = true, Name = "ux_content_folder_slug" }));

        // Refresh tokens auto-expire; Mongo purges them after they lapse.
        RefreshTokens.Indexes.CreateOne(new CreateIndexModel<RefreshToken>(
            Builders<RefreshToken>.IndexKeys.Ascending(r => r.ExpiresAt),
            new CreateIndexOptions { Name = "ttl_refresh", ExpireAfter = TimeSpan.Zero }));

        Audit.Indexes.CreateOne(new CreateIndexModel<LoginAudit>(
            Builders<LoginAudit>.IndexKeys.Descending(a => a.Timestamp),
            new CreateIndexOptions { Name = "ix_audit_ts" }));

        Links.Indexes.CreateOne(new CreateIndexModel<Link>(
            Builders<Link>.IndexKeys.Ascending(l => l.Category).Ascending(l => l.Order),
            new CreateIndexOptions { Name = "ix_link_category_order" }));
    }
}
