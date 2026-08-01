using MongoDB.Bson.Serialization.Attributes;

namespace Blog.Admin.Api.Models;

/// <summary>
/// Singleton application settings stored in Mongo and managed from the admin UI.
/// Secret fields (SMTP password, SMS token) are AES-encrypted at rest — the AES
/// key itself stays in env/Key Vault, never here. Bootstrap secrets (Mongo
/// connection string, AES key, JWT signing key) are NOT stored here by design.
/// </summary>
public sealed class AppSettings
{
    public const string SingletonId = "app";

    [BsonId]
    public string Id { get; set; } = SingletonId;

    // ---- General ----
    public string SiteTitle { get; set; } = "Content Blog";

    // ---- Two-factor availability ----
    public bool EmailTwoFactorEnabled { get; set; } = true;
    public bool SmsTwoFactorEnabled { get; set; }
    public bool WhatsAppTwoFactorEnabled { get; set; }

    // ---- Email (SMTP) ----
    public bool EmailEnabled { get; set; }
    public string EmailHost { get; set; } = string.Empty;
    public int EmailPort { get; set; } = 587;
    public bool EmailUseStartTls { get; set; } = true;
    public string EmailFromAddress { get; set; } = "no-reply@example.com";
    public string EmailFromName { get; set; } = "Blog Admin";
    public string EmailUsername { get; set; } = string.Empty;
    public string? EmailPasswordEncrypted { get; set; }   // 🔒 AES-encrypted.

    // ---- SMS (Twilio-compatible) ----
    public bool SmsEnabled { get; set; }
    public string SmsAccountSid { get; set; } = string.Empty;
    public string? SmsAuthTokenEncrypted { get; set; }    // 🔒 AES-encrypted.
    public string SmsFromNumber { get; set; } = string.Empty;

    // ---- Security ----
    public int MaxFailedLoginAttempts { get; set; } = 5;
    public int LockoutMinutes { get; set; } = 15;
    public int EmailOtpMinutes { get; set; } = 5;
    public int BackupCodeCount { get; set; } = 10;
    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 7;
    public int TwoFactorTokenMinutes { get; set; } = 5;

    // ---- WhatsApp security alerts (Meta Cloud API), sent on account lockout ----
    public bool WhatsAppAlertsEnabled { get; set; }
    public string? WhatsAppAccessTokenEncrypted { get; set; }   // 🔒 AES-encrypted.
    public string WhatsAppPhoneNumberId { get; set; } = string.Empty;
    public string WhatsAppAlertToNumber { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
