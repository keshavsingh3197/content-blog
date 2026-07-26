using Blog.Admin.Api.Data;
using Blog.Admin.Api.Models;
using KeshavSingh.Auth.Abstractions;
using MongoDB.Driver;

namespace Blog.Admin.Api.Auth;

/// <summary>Backs the auth engine's refresh-token store with this app's Mongo collection.</summary>
public sealed class MongoRefreshTokenStore : IRefreshTokenStore
{
    private readonly MongoContext _db;
    public MongoRefreshTokenStore(MongoContext db) => _db = db;

    public Task AddAsync(RefreshTokenRecord token, CancellationToken ct = default) =>
        _db.RefreshTokens.InsertOneAsync(new RefreshToken
        {
            UserId = token.UserId,
            TokenHash = token.TokenHash,
            ExpiresAt = token.ExpiresAt,
        }, cancellationToken: ct);

    public async Task<RefreshTokenRecord?> FindByHashAsync(string tokenHash, CancellationToken ct = default)
    {
        var r = await _db.RefreshTokens.Find(x => x.TokenHash == tokenHash).FirstOrDefaultAsync(ct);
        return r is null ? null : new RefreshTokenRecord
        {
            Id = r.Id,
            UserId = r.UserId,
            TokenHash = r.TokenHash,
            ExpiresAt = r.ExpiresAt,
            CreatedAt = r.CreatedAt,
            RevokedAt = r.RevokedAt,
        };
    }

    public Task RevokeAsync(RefreshTokenRecord token, CancellationToken ct = default) =>
        _db.RefreshTokens.UpdateOneAsync(r => r.Id == token.Id,
            Builders<RefreshToken>.Update.Set(r => r.RevokedAt, DateTime.UtcNow), cancellationToken: ct);

    public Task RevokeByHashAsync(string tokenHash, CancellationToken ct = default) =>
        _db.RefreshTokens.UpdateManyAsync(r => r.TokenHash == tokenHash && r.RevokedAt == null,
            Builders<RefreshToken>.Update.Set(r => r.RevokedAt, DateTime.UtcNow), cancellationToken: ct);

    public Task RevokeAllForUserAsync(string userId, CancellationToken ct = default) =>
        _db.RefreshTokens.UpdateManyAsync(r => r.UserId == userId && r.RevokedAt == null,
            Builders<RefreshToken>.Update.Set(r => r.RevokedAt, DateTime.UtcNow), cancellationToken: ct);
}
