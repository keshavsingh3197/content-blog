namespace Blog.Admin.Api.Configuration;

// JwtOptions and EncryptionOptions live in the shared KeshavSingh.Security package. Email, SMS and
// security-threshold options used to live here; they configured the local login/2FA engine, which
// moved to the identity provider — see docs/code_review.md § H-2.

public sealed class MediaOptions
{
    public const string Section = "Media";
    public string StoragePath { get; set; } = "App_Data/media";
    public long MaxFileBytes { get; set; } = 5 * 1024 * 1024;
    // Raster types only: each has a magic-byte signature the upload verifies. SVG is deliberately
    // absent — see MediaController.ExtByType.
    public string[] AllowedContentTypes { get; set; } =
        { "image/png", "image/jpeg", "image/gif", "image/webp" };
}

// Note: CORS is configured via a named policy in Program.cs (CorsPolicy); there is deliberately no
// CorsOptions binding here.
