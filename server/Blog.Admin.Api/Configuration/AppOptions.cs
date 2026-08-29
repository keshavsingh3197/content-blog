namespace Blog.Admin.Api.Configuration;

// JwtOptions and EncryptionOptions now live in the shared KeshavSingh.Security package.

public sealed class EmailOptions
{
    public const string Section = "Email";
    public bool Enabled { get; set; }
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public bool UseStartTls { get; set; } = true;
    public string FromAddress { get; set; } = "no-reply@example.com";
    public string FromName { get; set; } = "Blog Admin";
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public sealed class SmsOptions
{
    public const string Section = "Sms";
    public bool Enabled { get; set; }
    public string AccountSid { get; set; } = string.Empty; // Twilio-compatible.
    public string AuthToken { get; set; } = string.Empty;
    public string FromNumber { get; set; } = string.Empty;
}

public sealed class SecurityOptions
{
    public const string Section = "Security";
    public int MaxFailedLoginAttempts { get; set; } = 5;
    public int LockoutMinutes { get; set; } = 15;
    public int EmailOtpMinutes { get; set; } = 5;
    public int BackupCodeCount { get; set; } = 10;
}

public sealed class MediaOptions
{
    public const string Section = "Media";
    public string StoragePath { get; set; } = "App_Data/media";
    public long MaxFileBytes { get; set; } = 5 * 1024 * 1024;
    public string[] AllowedContentTypes { get; set; } =
        { "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml" };
}

public sealed class SettingsRefreshOptions
{
    public const string Section = "SettingsRefresh";
    // How often the cached settings are re-read from Mongo so edits made by the central admin
    // console (or another instance) take effect here within this interval.
    public int IntervalSeconds { get; set; } = 30;
}
// Note: CORS is configured via a named policy in Program.cs (CorsPolicy); there is deliberately no
// CorsOptions binding here.
