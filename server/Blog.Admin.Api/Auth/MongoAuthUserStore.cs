using Blog.Admin.Api.Data;
using Blog.Admin.Api.Models;
using KeshavSingh.Auth.Abstractions;
using MongoDB.Driver;

namespace Blog.Admin.Api.Auth;

/// <summary>
/// Maps this app's Mongo <see cref="User"/> document onto the auth engine's neutral
/// <see cref="AuthUser"/> and persists the engine-managed fields back. The user's
/// identity, roles, and non-auth data are owned by the app and untouched by SaveAsync.
/// </summary>
public sealed class MongoAuthUserStore : IAuthUserStore
{
    private readonly MongoContext _db;
    public MongoAuthUserStore(MongoContext db) => _db = db;

    public async Task<AuthUser?> FindByLoginAsync(string identifier, CancellationToken ct = default)
    {
        var lower = identifier.ToLowerInvariant();
        var user = await _db.Users
            .Find(u => (u.Email == lower || u.Username == identifier) && !u.IsDeleted)
            .FirstOrDefaultAsync(ct);
        return user is null ? null : Map(user);
    }

    public async Task<AuthUser?> FindByIdAsync(string userId, CancellationToken ct = default)
    {
        var user = await _db.Users.Find(u => u.Id == userId && !u.IsDeleted).FirstOrDefaultAsync(ct);
        return user is null ? null : Map(user);
    }

    public Task SaveAsync(AuthUser user, CancellationToken ct = default)
    {
        // Persist only the fields the engine owns. Roles/DisplayName/etc. are managed
        // elsewhere (UsersController) and deliberately left alone here.
        var update = Builders<User>.Update
            .Set(u => u.PasswordHash, user.PasswordHash)
            .Set(u => u.MustChangePassword, user.MustChangePassword)
            .Set(u => u.TwoFactorEnabled, user.TwoFactorEnabled)
            .Set(u => u.TotpSecretEncrypted, user.TotpSecretEncrypted)
            .Set(u => u.BackupCodeHashes, user.BackupCodeHashes.ToList())
            .Set(u => u.EmailOtpHash, user.EmailOtpHash)
            .Set(u => u.EmailOtpExpiresAt, user.EmailOtpExpiresAt)
            .Set(u => u.EmailOtpAttempts, user.EmailOtpAttempts)
            .Set(u => u.FailedLoginAttempts, user.FailedLoginAttempts)
            .Set(u => u.LockoutUntil, user.LockoutUntil)
            .Set(u => u.LastLoginAt, user.LastLoginAt)
            .Set(u => u.UpdatedAt, DateTime.UtcNow);
        return _db.Users.UpdateOneAsync(u => u.Id == user.Id, update, cancellationToken: ct);
    }

    private static AuthUser Map(User u) => new()
    {
        Id = u.Id,
        Email = u.Email,
        Username = u.Username,
        DisplayName = u.DisplayName,
        PhoneNumber = u.PhoneNumber,
        PasswordHash = u.PasswordHash,
        MustChangePassword = u.MustChangePassword,
        Roles = u.Roles.ToList(),
        TwoFactorEnabled = u.TwoFactorEnabled,
        TotpSecretEncrypted = u.TotpSecretEncrypted,
        BackupCodeHashes = u.BackupCodeHashes.ToList(),
        EmailOtpHash = u.EmailOtpHash,
        EmailOtpExpiresAt = u.EmailOtpExpiresAt,
        EmailOtpAttempts = u.EmailOtpAttempts,
        IsActive = u.IsActive,
        IsDeleted = u.IsDeleted,
        FailedLoginAttempts = u.FailedLoginAttempts,
        LockoutUntil = u.LockoutUntil,
        LastLoginAt = u.LastLoginAt,
    };
}
