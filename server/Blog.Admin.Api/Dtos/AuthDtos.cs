using System.ComponentModel.DataAnnotations;

namespace Blog.Admin.Api.Dtos;

// Input is validated at this trust boundary before any processing.

public sealed record LoginRequest(
    [property: Required, EmailAddress, MaxLength(256)] string Email,
    [property: Required, MaxLength(256)] string Password);

/// <summary>Returned after the password step. When TwoFactorRequired, no access token is issued yet.</summary>
public sealed record LoginResponse(
    bool TwoFactorRequired,
    string? TwoFactorToken,
    bool EmailFallbackAvailable,
    AuthTokens? Tokens);

public sealed record AuthTokens(
    string AccessToken,
    DateTime AccessTokenExpiresAt,
    string RefreshToken,
    UserProfile User);

public enum TwoFactorMethod { Totp, Email, BackupCode }

public sealed record TwoFactorVerifyRequest(
    [property: Required] string TwoFactorToken,
    [property: Required, MaxLength(32)] string Code,
    TwoFactorMethod Method = TwoFactorMethod.Totp);

public sealed record SendEmailOtpRequest([property: Required] string TwoFactorToken);

public sealed record RefreshRequest([property: Required] string RefreshToken);

public sealed record LogoutRequest(string? RefreshToken);

// ---- Enrollment (authenticated) ----

public sealed record EnrollStartResponse(string Secret, string OtpAuthUri, string QrCodePngDataUrl);

public sealed record EnrollConfirmRequest(
    [property: Required, MaxLength(12)] string Code);

public sealed record EnrollConfirmResponse(IReadOnlyList<string> BackupCodes);

public sealed record DisableTwoFactorRequest(
    [property: Required, MaxLength(256)] string Password);

public sealed record UserProfile(
    string Id,
    string Email,
    string DisplayName,
    IReadOnlyList<string> Roles,
    bool TwoFactorEnabled);
