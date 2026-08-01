using System.ComponentModel.DataAnnotations;

namespace Blog.Admin.Api.Dtos;

/// <summary>Settings returned to the admin UI. Secrets are never returned — only whether they are set.</summary>
public sealed record SettingsView(
    string SiteTitle,
    bool EmailTwoFactorEnabled,
    bool SmsTwoFactorEnabled,
    bool EmailEnabled,
    string EmailHost,
    int EmailPort,
    bool EmailUseStartTls,
    string EmailFromAddress,
    string EmailFromName,
    string EmailUsername,
    bool EmailPasswordSet,
    bool SmsEnabled,
    string SmsAccountSid,
    bool SmsAuthTokenSet,
    string SmsFromNumber,
    int MaxFailedLoginAttempts,
    int LockoutMinutes,
    int EmailOtpMinutes,
    int BackupCodeCount,
    bool WhatsAppAlertsEnabled,
    bool WhatsAppAccessTokenSet,
    string WhatsAppPhoneNumberId,
    string WhatsAppAlertToNumber,
    DateTime UpdatedAt);

/// <summary>
/// Partial update. Null string/secret = keep existing; a non-empty secret replaces it.
/// </summary>
public sealed record UpdateSettingsRequest(
    [MaxLength(120)] string? SiteTitle,
    bool? EmailTwoFactorEnabled,
    bool? SmsTwoFactorEnabled,
    bool? EmailEnabled,
    [MaxLength(200)] string? EmailHost,
    int? EmailPort,
    bool? EmailUseStartTls,
    [MaxLength(200)] string? EmailFromAddress,
    [MaxLength(120)] string? EmailFromName,
    [MaxLength(200)] string? EmailUsername,
    [MaxLength(400)] string? EmailPassword,
    bool? SmsEnabled,
    [MaxLength(120)] string? SmsAccountSid,
    [MaxLength(400)] string? SmsAuthToken,
    [MaxLength(20)] string? SmsFromNumber,
    [Range(3, 20)] int? MaxFailedLoginAttempts,
    [Range(1, 1440)] int? LockoutMinutes,
    [Range(1, 60)] int? EmailOtpMinutes,
    [Range(4, 20)] int? BackupCodeCount,
    bool? WhatsAppAlertsEnabled,
    [MaxLength(400)] string? WhatsAppAccessToken,
    [MaxLength(60)] string? WhatsAppPhoneNumberId,
    [MaxLength(20)] string? WhatsAppAlertToNumber);
