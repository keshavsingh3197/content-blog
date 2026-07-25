using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Blog.Admin.Api.Models;

/// <summary>An admin user. Sensitive fields are hashed or encrypted at rest.</summary>
public sealed class User
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    public string Email { get; set; } = string.Empty;          // Stored lower-cased, unique.
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>PBKDF2 hash string (format: iterations.salt.hash). Never the raw password.</summary>
    public string PasswordHash { get; set; } = string.Empty;

    public List<string> Roles { get; set; } = new();

    // ---- Two-factor (TOTP authenticator, default method) ----
    public bool TwoFactorEnabled { get; set; }

    /// <summary>Base32 TOTP shared secret, AES-256-GCM encrypted at rest. Null until enrolled.</summary>
    public string? TotpSecretEncrypted { get; set; }

    /// <summary>Hashed one-time recovery/backup codes. Each is removed once used.</summary>
    public List<string> BackupCodeHashes { get; set; } = new();

    // ---- Email OTP fallback ----
    public string? EmailOtpHash { get; set; }
    public DateTime? EmailOtpExpiresAt { get; set; }
    public int EmailOtpAttempts { get; set; }

    // ---- Account state / lockout ----
    public bool IsActive { get; set; } = true;
    public int FailedLoginAttempts { get; set; }
    public DateTime? LockoutUntil { get; set; }
    public DateTime? LastLoginAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
