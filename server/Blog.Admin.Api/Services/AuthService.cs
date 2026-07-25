using Blog.Admin.Api.Configuration;
using Blog.Admin.Api.Data;
using Blog.Admin.Api.Dtos;
using Blog.Admin.Api.Models;
using Blog.Admin.Api.Security;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using QRCoder;

namespace Blog.Admin.Api.Services;

/// <summary>Thrown for expected auth failures; surfaced as safe 400/401 responses (no internals).</summary>
public sealed class AuthException : Exception
{
    public int StatusCode { get; }
    public AuthException(string message, int statusCode = 401) : base(message) => StatusCode = statusCode;
}

public sealed class AuthService
{
    private readonly MongoContext _db;
    private readonly PasswordHasher _passwords;
    private readonly TotpService _totp;
    private readonly DataProtector _protector;
    private readonly JwtService _jwt;
    private readonly IEmailSender _email;
    private readonly AuditLogger _audit;
    private readonly SecurityOptions _security;
    private readonly JwtOptions _jwtOptions;

    public AuthService(
        MongoContext db, PasswordHasher passwords, TotpService totp, DataProtector protector,
        JwtService jwt, IEmailSender email, AuditLogger audit,
        IOptions<SecurityOptions> security, IOptions<JwtOptions> jwtOptions)
    {
        _db = db;
        _passwords = passwords;
        _totp = totp;
        _protector = protector;
        _jwt = jwt;
        _email = email;
        _audit = audit;
        _security = security.Value;
        _jwtOptions = jwtOptions.Value;
    }

    // ---- Step 1: password ----

    public async Task<LoginResponse> LoginAsync(LoginRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.Find(u => u.Email == email).FirstOrDefaultAsync();

        // Uniform failure for unknown user / bad password / inactive: no account enumeration.
        if (user is null || !user.IsActive)
        {
            await _audit.LogAsync(AuditEvents.LoginPasswordFailed, false, email);
            throw new AuthException("Invalid credentials.");
        }

        if (user.LockoutUntil is { } until && until > DateTime.UtcNow)
        {
            await _audit.LogAsync(AuditEvents.LoginLockedOut, false, email, user.Id);
            throw new AuthException("Account is temporarily locked. Try again later.", 423);
        }

        if (!_passwords.Verify(req.Password, user.PasswordHash))
        {
            await RegisterFailedAttemptAsync(user);
            await _audit.LogAsync(AuditEvents.LoginPasswordFailed, false, email, user.Id);
            throw new AuthException("Invalid credentials.");
        }

        // Password OK — clear failure counters.
        await _db.Users.UpdateOneAsync(u => u.Id == user.Id,
            Builders<User>.Update.Set(u => u.FailedLoginAttempts, 0).Set(u => u.LockoutUntil, null));
        await _audit.LogAsync(AuditEvents.LoginPasswordSuccess, true, email, user.Id);

        if (!user.TwoFactorEnabled)
            return new LoginResponse(false, null, false, await IssueTokensAsync(user));

        // 2FA required — issue a short-lived step token; do not issue access yet.
        var twoFactorToken = _jwt.CreateTwoFactorToken(user);
        return new LoginResponse(true, twoFactorToken, EmailFallbackAvailable: true, Tokens: null);
    }

    // ---- Step 2: two-factor ----

    public async Task<AuthTokens> VerifyTwoFactorAsync(TwoFactorVerifyRequest req)
    {
        var user = await RequireTwoFactorUserAsync(req.TwoFactorToken);

        var ok = req.Method switch
        {
            TwoFactorMethod.Totp => VerifyTotp(user, req.Code),
            TwoFactorMethod.Email => await VerifyEmailOtpAsync(user, req.Code),
            TwoFactorMethod.BackupCode => await VerifyBackupCodeAsync(user, req.Code),
            _ => false,
        };

        if (!ok)
        {
            await _audit.LogAsync(AuditEvents.TwoFactorFailed, false, user.Email, user.Id);
            throw new AuthException("Invalid or expired verification code.");
        }

        await _audit.LogAsync(AuditEvents.TwoFactorSuccess, true, user.Email, user.Id);
        return await IssueTokensAsync(user);
    }

    public async Task SendEmailOtpAsync(SendEmailOtpRequest req)
    {
        var user = await RequireTwoFactorUserAsync(req.TwoFactorToken);

        var code = TokenHasher.NewNumericOtp(6);
        var update = Builders<User>.Update
            .Set(u => u.EmailOtpHash, TokenHasher.Hash(code))
            .Set(u => u.EmailOtpExpiresAt, DateTime.UtcNow.AddMinutes(_security.EmailOtpMinutes))
            .Set(u => u.EmailOtpAttempts, 0);
        await _db.Users.UpdateOneAsync(u => u.Id == user.Id, update);

        await _email.SendOtpAsync(user.Email, code);
        await _audit.LogAsync(AuditEvents.TwoFactorEmailSent, true, user.Email, user.Id);
    }

    private bool VerifyTotp(User user, string code)
    {
        if (!user.TwoFactorEnabled || user.TotpSecretEncrypted is null) return false;
        var secret = _protector.Decrypt(user.TotpSecretEncrypted);
        return _totp.VerifyCode(secret, code);
    }

    private async Task<bool> VerifyEmailOtpAsync(User user, string code)
    {
        if (user.EmailOtpHash is null || user.EmailOtpExpiresAt is null ||
            user.EmailOtpExpiresAt < DateTime.UtcNow || user.EmailOtpAttempts >= 5)
            return false;

        if (!TokenHasher.Verify(code.Trim(), user.EmailOtpHash))
        {
            await _db.Users.UpdateOneAsync(u => u.Id == user.Id,
                Builders<User>.Update.Inc(u => u.EmailOtpAttempts, 1));
            return false;
        }

        // Single-use: clear on success.
        await _db.Users.UpdateOneAsync(u => u.Id == user.Id, Builders<User>.Update
            .Set(u => u.EmailOtpHash, null)
            .Set(u => u.EmailOtpExpiresAt, null)
            .Set(u => u.EmailOtpAttempts, 0));
        return true;
    }

    private async Task<bool> VerifyBackupCodeAsync(User user, string code)
    {
        var normalized = code.Trim().ToLowerInvariant();
        var hash = user.BackupCodeHashes.FirstOrDefault(h => TokenHasher.Verify(normalized, h));
        if (hash is null) return false;

        // Burn the code so it can never be reused.
        await _db.Users.UpdateOneAsync(u => u.Id == user.Id,
            Builders<User>.Update.Pull(u => u.BackupCodeHashes, hash));
        await _audit.LogAsync(AuditEvents.BackupCodeUsed, true, user.Email, user.Id);
        return true;
    }

    // ---- Enrollment ----

    public async Task<EnrollStartResponse> StartEnrollmentAsync(string userId)
    {
        var user = await GetActiveUserAsync(userId);
        var secret = _totp.GenerateSecret();

        // Stash the (encrypted) pending secret; it only becomes active on confirm.
        await _db.Users.UpdateOneAsync(u => u.Id == user.Id,
            Builders<User>.Update.Set(u => u.TotpSecretEncrypted, _protector.Encrypt(secret)));

        var uri = _totp.BuildOtpAuthUri(secret, _jwtOptions.Issuer, user.Email);
        return new EnrollStartResponse(secret, uri, BuildQrDataUrl(uri));
    }

    public async Task<EnrollConfirmResponse> ConfirmEnrollmentAsync(string userId, string code)
    {
        var user = await GetActiveUserAsync(userId);
        if (user.TotpSecretEncrypted is null)
            throw new AuthException("Start enrollment before confirming.", 400);

        var secret = _protector.Decrypt(user.TotpSecretEncrypted);
        if (!_totp.VerifyCode(secret, code))
            throw new AuthException("The code did not match. Check your authenticator and try again.", 400);

        var backupCodes = Enumerable.Range(0, _security.BackupCodeCount)
            .Select(_ => TokenHasher.NewBackupCode()).ToList();

        await _db.Users.UpdateOneAsync(u => u.Id == user.Id, Builders<User>.Update
            .Set(u => u.TwoFactorEnabled, true)
            .Set(u => u.BackupCodeHashes, backupCodes.Select(TokenHasher.Hash).ToList())
            .Set(u => u.UpdatedAt, DateTime.UtcNow));

        await _audit.LogAsync(AuditEvents.TwoFactorEnrolled, true, user.Email, user.Id);
        return new EnrollConfirmResponse(backupCodes); // Shown once, never stored in the clear.
    }

    public async Task DisableTwoFactorAsync(string userId, string password)
    {
        var user = await GetActiveUserAsync(userId);
        if (!_passwords.Verify(password, user.PasswordHash))
            throw new AuthException("Password confirmation failed.", 400);

        await _db.Users.UpdateOneAsync(u => u.Id == user.Id, Builders<User>.Update
            .Set(u => u.TwoFactorEnabled, false)
            .Set(u => u.TotpSecretEncrypted, null)
            .Set(u => u.BackupCodeHashes, new List<string>())
            .Set(u => u.UpdatedAt, DateTime.UtcNow));

        await _audit.LogAsync(AuditEvents.TwoFactorDisabled, true, user.Email, user.Id);
    }

    // ---- Tokens ----

    public async Task<AuthTokens> RefreshAsync(string refreshToken)
    {
        var hash = TokenHasher.Hash(refreshToken);
        var record = await _db.RefreshTokens.Find(r => r.TokenHash == hash).FirstOrDefaultAsync();
        if (record is null || !record.IsActive)
            throw new AuthException("Session expired. Please sign in again.");

        var user = await _db.Users.Find(u => u.Id == record.UserId).FirstOrDefaultAsync();
        if (user is null || !user.IsActive)
            throw new AuthException("Session expired. Please sign in again.");

        // Rotate: revoke the presented token and mint a fresh pair.
        await _db.RefreshTokens.UpdateOneAsync(r => r.Id == record.Id,
            Builders<RefreshToken>.Update.Set(r => r.RevokedAt, DateTime.UtcNow));
        await _audit.LogAsync(AuditEvents.TokenRefreshed, true, user.Email, user.Id);
        return await IssueTokensAsync(user);
    }

    public async Task LogoutAsync(string userId, string? refreshToken)
    {
        // Revoke the presented token, or all of the user's tokens if none supplied.
        if (!string.IsNullOrEmpty(refreshToken))
        {
            var hash = TokenHasher.Hash(refreshToken);
            await _db.RefreshTokens.UpdateManyAsync(r => r.TokenHash == hash && r.RevokedAt == null,
                Builders<RefreshToken>.Update.Set(r => r.RevokedAt, DateTime.UtcNow));
        }
        else
        {
            await _db.RefreshTokens.UpdateManyAsync(r => r.UserId == userId && r.RevokedAt == null,
                Builders<RefreshToken>.Update.Set(r => r.RevokedAt, DateTime.UtcNow));
        }
        await _audit.LogAsync(AuditEvents.LoggedOut, true, string.Empty, userId);
    }

    // ---- Helpers ----

    private async Task<AuthTokens> IssueTokensAsync(User user)
    {
        var (access, accessExpires) = _jwt.CreateAccessToken(user);
        var refresh = TokenHasher.NewOpaqueToken();

        await _db.RefreshTokens.InsertOneAsync(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = TokenHasher.Hash(refresh),
            ExpiresAt = _jwt.RefreshTokenExpiry(),
        });

        await _db.Users.UpdateOneAsync(u => u.Id == user.Id,
            Builders<User>.Update.Set(u => u.LastLoginAt, DateTime.UtcNow));

        var profile = new UserProfile(user.Id, user.Email, user.DisplayName, user.Roles, user.TwoFactorEnabled);
        return new AuthTokens(access, accessExpires, refresh, profile);
    }

    private async Task RegisterFailedAttemptAsync(User user)
    {
        var attempts = user.FailedLoginAttempts + 1;
        var update = Builders<User>.Update.Set(u => u.FailedLoginAttempts, attempts);
        if (attempts >= _security.MaxFailedLoginAttempts)
            update = update.Set(u => u.LockoutUntil, DateTime.UtcNow.AddMinutes(_security.LockoutMinutes));
        await _db.Users.UpdateOneAsync(u => u.Id == user.Id, update);
    }

    private async Task<User> RequireTwoFactorUserAsync(string token)
    {
        var userId = _jwt.ValidateTwoFactorToken(token)
                     ?? throw new AuthException("Two-factor session expired. Sign in again.");
        return await GetActiveUserAsync(userId);
    }

    private async Task<User> GetActiveUserAsync(string userId)
    {
        var user = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user is null || !user.IsActive) throw new AuthException("Account unavailable.");
        return user;
    }

    private static string BuildQrDataUrl(string otpAuthUri)
    {
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(otpAuthUri, QRCodeGenerator.ECCLevel.Q);
        var png = new PngByteQRCode(data).GetGraphic(8);
        return $"data:image/png;base64,{Convert.ToBase64String(png)}";
    }
}
