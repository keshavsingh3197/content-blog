namespace Blog.Admin.Api.Configuration;

/// <summary>Strongly-typed configuration bound from appsettings + secret providers.</summary>
public sealed class MongoOptions
{
    public const string Section = "Mongo";
    public string ConnectionString { get; set; } = string.Empty;
    public string Database { get; set; } = "blog_admin";
}

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

public sealed class SeedOptions
{
    public const string Section = "Seed";
    public string AdminEmail { get; set; } = string.Empty;
    public string AdminDisplayName { get; set; } = "Administrator";
    public string AdminPassword { get; set; } = string.Empty;
}

public sealed class CorsOptions
{
    public const string Section = "Cors";
    public string[] AllowedOrigins { get; set; } = Array.Empty<string>();
}
