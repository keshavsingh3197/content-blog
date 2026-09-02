using Blog.Admin.Api.Configuration;
using Blog.Admin.Api.Models;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Blog.Admin.Api.Data;

/// <summary>Central access point for the MongoDB collections used by the admin API.</summary>
public sealed class MongoContext
{
    public IMongoCollection<ContentTopic> Content { get; }
    public IMongoCollection<MediaAsset> Media { get; }
    public IMongoCollection<Link> Links { get; }
    public IMongoCollection<Comment> Comments { get; }
    public IMongoCollection<CommentBan> CommentBans { get; }
    public IMongoCollection<PageStat> PageStats { get; }
    public IMongoCollection<PageViewHit> PageViewHits { get; }

    public MongoContext(MongoDbService db)
    {
        Content = db.GetCollection<ContentTopic>("content");
        Media = db.GetCollection<MediaAsset>("media");
        Links = db.GetCollection<Link>("links");
        Comments = db.GetCollection<Comment>("comments");
        CommentBans = db.GetCollection<CommentBan>("comment_bans");
        PageStats = db.GetCollection<PageStat>("page_stats");
        PageViewHits = db.GetCollection<PageViewHit>("page_view_hits");

        EnsureIndexes();
    }

    /// <summary>
    /// Round-trips a `ping` to the database. The /health probe uses it so a green check means the
    /// process can actually reach its data store, not just that it is listening.
    /// </summary>
    public Task PingAsync(CancellationToken ct = default) =>
        Content.Database.RunCommandAsync<BsonDocument>(
            new BsonDocument("ping", 1), cancellationToken: ct);

    private void EnsureIndexes()
    {
        Content.Indexes.CreateOne(new CreateIndexModel<ContentTopic>(
            Builders<ContentTopic>.IndexKeys.Ascending(c => c.Folder).Ascending(c => c.Slug),
            new CreateIndexOptions { Unique = true, Name = "ux_content_folder_slug" }));

        Links.Indexes.CreateOne(new CreateIndexModel<Link>(
            Builders<Link>.IndexKeys.Ascending(l => l.Category).Ascending(l => l.Order),
            new CreateIndexOptions { Name = "ix_link_category_order" }));

        // A page's thread is always read by path, oldest first.
        Comments.Indexes.CreateOne(new CreateIndexModel<Comment>(
            Builders<Comment>.IndexKeys.Ascending(c => c.Path).Ascending(c => c.CreatedAt),
            new CreateIndexOptions { Name = "ix_comment_path_created" }));

        // The moderation screen lists newest first across every page.
        Comments.Indexes.CreateOne(new CreateIndexModel<Comment>(
            Builders<Comment>.IndexKeys.Descending(c => c.CreatedAt),
            new CreateIndexOptions { Name = "ix_comment_created" }));

        // Ban display-name lookups query comments by UserId (and the author-identity joins).
        Comments.Indexes.CreateOne(new CreateIndexModel<Comment>(
            Builders<Comment>.IndexKeys.Ascending(c => c.UserId).Descending(c => c.CreatedAt),
            new CreateIndexOptions { Name = "ix_comment_user_created" }));

        // This unique index IS the view de-duplication: a second insert for the same reader and
        // page fails, and the counter is only incremented when the insert succeeds.
        PageViewHits.Indexes.CreateOne(new CreateIndexModel<PageViewHit>(
            Builders<PageViewHit>.IndexKeys.Ascending(h => h.Path).Ascending(h => h.VisitorKey),
            new CreateIndexOptions { Unique = true, Name = "ux_page_view_hit" }));

        // …and this one keeps the window finite: after it lapses the same reader counts again, and
        // the visitor digests (derived from personal data) stop being retained.
        PageViewHits.Indexes.CreateOne(new CreateIndexModel<PageViewHit>(
            Builders<PageViewHit>.IndexKeys.Ascending(h => h.SeenAt),
            new CreateIndexOptions { Name = "ttl_page_view_hit", ExpireAfter = TimeSpan.FromHours(12) }));
    }
}
