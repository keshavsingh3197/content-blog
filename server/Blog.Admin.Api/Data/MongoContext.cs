using Blog.Admin.Api.Configuration;
using Blog.Admin.Api.Models;
using Microsoft.Extensions.Options;
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

    public MongoContext(IOptions<MongoOptions> options)
    {
        var opts = options.Value;
        if (string.IsNullOrWhiteSpace(opts.ConnectionString))
            throw new InvalidOperationException(
                "Mongo:ConnectionString is not configured. Provide it via user-secrets, the " +
                "Mongo__ConnectionString environment variable, or Azure Key Vault.");

        var client = new MongoClient(opts.ConnectionString);
        var db = client.GetDatabase(opts.Database);

        Users = db.GetCollection<User>("users");
        Content = db.GetCollection<ContentTopic>("content");
        Media = db.GetCollection<MediaAsset>("media");
        Audit = db.GetCollection<LoginAudit>("audit");
        RefreshTokens = db.GetCollection<RefreshToken>("refresh_tokens");

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
    }
}
