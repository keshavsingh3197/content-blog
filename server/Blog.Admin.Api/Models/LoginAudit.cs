using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Blog.Admin.Api.Models;

/// <summary>Security audit event. Never stores passwords, tokens, or other personal data.</summary>
public sealed class LoginAudit
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    public string? UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Event { get; set; } = string.Empty;        // See AuditEvents.
    public bool Success { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public static class AuditEvents
{
    public const string LoginPasswordSuccess = "login.password.success";
    public const string LoginPasswordFailed = "login.password.failed";
    public const string LoginLockedOut = "login.locked_out";
    public const string TwoFactorSuccess = "2fa.success";
    public const string TwoFactorFailed = "2fa.failed";
    public const string TwoFactorEmailSent = "2fa.email.sent";
    public const string TwoFactorSmsSent = "2fa.sms.sent";
    public const string TwoFactorEnrolled = "2fa.enrolled";
    public const string TwoFactorDisabled = "2fa.disabled";
    public const string BackupCodeUsed = "2fa.backup_code.used";
    public const string TokenRefreshed = "token.refreshed";
    public const string LoggedOut = "logout";
}
