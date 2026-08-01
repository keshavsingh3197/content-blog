using System.Text.Json;
using Blog.Admin.Api.Configuration;
using Blog.Admin.Api.Data;
using Blog.Admin.Api.Dtos;
using Blog.Admin.Api.Models;
using KeshavSingh.Auth.Abstractions;
using KeshavSingh.Core;
using KeshavSingh.Security;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace Blog.Admin.Api.Services;

/// <summary>
/// Loads and caches the singleton <see cref="AppSettings"/> from Mongo, seeding it
/// from env/appsettings defaults on first run. Secret fields are AES-encrypted at
/// rest via <see cref="DataProtector"/>. The cached copy gives synchronous access
/// across the app; it is refreshed whenever settings are updated.
/// </summary>
public sealed class SettingsService : IAuthSettings, IWhatsAppSettings
{
    private readonly MongoContext _db;
    private readonly DataProtector _protector;
    private readonly IServiceProvider _seedDefaults;
    private volatile AppSettings _current = new();

    public SettingsService(MongoContext db, DataProtector protector, IServiceProvider seedDefaults)
    {
        _db = db;
        _protector = protector;
        _seedDefaults = seedDefaults;
    }

    /// <summary>The current cached settings (never null after Init).</summary>
    public AppSettings Current => _current;

    // ---- IAuthSettings: the thin slice the shared auth engine reads ----
    public bool EmailTwoFactorEnabled => _current.EmailTwoFactorEnabled;
    public bool SmsTwoFactorEnabled => _current.SmsTwoFactorEnabled;
    public bool WhatsAppTwoFactorEnabled => _current.WhatsAppTwoFactorEnabled;
    public int EmailOtpMinutes => _current.EmailOtpMinutes;
    public int MaxFailedLoginAttempts => _current.MaxFailedLoginAttempts;
    public int LockoutMinutes => _current.LockoutMinutes;
    public int BackupCodeCount => _current.BackupCodeCount;
    public int AccessTokenMinutes => _current.AccessTokenMinutes;
    public int RefreshTokenDays => _current.RefreshTokenDays;
    public int TwoFactorTokenMinutes => _current.TwoFactorTokenMinutes;

    // ---- IWhatsAppSettings (read by WhatsAppNotifier) ----
    public bool WhatsAppAlertsEnabled => _current.WhatsAppAlertsEnabled;
    public string WhatsAppAccessToken => Decrypt(_current.WhatsAppAccessTokenEncrypted) ?? string.Empty;
    public string WhatsAppPhoneNumberId => _current.WhatsAppPhoneNumberId;
    public string WhatsAppAlertToNumber => _current.WhatsAppAlertToNumber;

    public async Task InitAsync()
    {
        var existing = await _db.Settings.Find(s => s.Id == AppSettings.SingletonId).FirstOrDefaultAsync();
        if (existing is not null) { _current = existing; return; }

        // First run: seed from env/appsettings so behaviour is unchanged until edited.
        var email = _seedDefaults.GetRequiredService<IOptions<EmailOptions>>().Value;
        var sms = _seedDefaults.GetRequiredService<IOptions<SmsOptions>>().Value;
        var security = _seedDefaults.GetRequiredService<IOptions<SecurityOptions>>().Value;
        var jwt = _seedDefaults.GetRequiredService<IOptions<JwtOptions>>().Value;

        var seeded = new AppSettings
        {
            EmailEnabled = email.Enabled,
            EmailHost = email.Host,
            EmailPort = email.Port,
            EmailUseStartTls = email.UseStartTls,
            EmailFromAddress = email.FromAddress,
            EmailFromName = email.FromName,
            EmailUsername = email.Username,
            EmailPasswordEncrypted = string.IsNullOrEmpty(email.Password) ? null : _protector.Encrypt(email.Password),
            SmsEnabled = sms.Enabled,
            SmsAccountSid = sms.AccountSid,
            SmsAuthTokenEncrypted = string.IsNullOrEmpty(sms.AuthToken) ? null : _protector.Encrypt(sms.AuthToken),
            SmsFromNumber = sms.FromNumber,
            SmsTwoFactorEnabled = sms.Enabled,
            MaxFailedLoginAttempts = security.MaxFailedLoginAttempts,
            LockoutMinutes = security.LockoutMinutes,
            EmailOtpMinutes = security.EmailOtpMinutes,
            BackupCodeCount = security.BackupCodeCount,
            AccessTokenMinutes = jwt.AccessTokenMinutes,
            RefreshTokenDays = jwt.RefreshTokenDays,
            TwoFactorTokenMinutes = jwt.TwoFactorTokenMinutes,
        };
        await _db.Settings.ReplaceOneAsync(s => s.Id == AppSettings.SingletonId, seeded,
            new ReplaceOptions { IsUpsert = true });
        _current = seeded;
    }

    // ---- Decrypted accessors for senders ----
    public string? EmailPassword => Decrypt(_current.EmailPasswordEncrypted);
    public string? SmsAuthToken => Decrypt(_current.SmsAuthTokenEncrypted);

    private string? Decrypt(string? value)
    {
        if (string.IsNullOrEmpty(value)) return null;
        try { return _protector.Decrypt(value); }
        catch { return null; } // Wrong/rotated key — fail closed rather than throw.
    }

    // ---- Read/update for the admin UI ----
    public SettingsView ToView()
    {
        var s = _current;
        return new SettingsView(
            s.SiteTitle, s.EmailTwoFactorEnabled, s.SmsTwoFactorEnabled, s.WhatsAppTwoFactorEnabled,
            s.EmailEnabled, s.EmailHost, s.EmailPort, s.EmailUseStartTls,
            s.EmailFromAddress, s.EmailFromName, s.EmailUsername, !string.IsNullOrEmpty(s.EmailPasswordEncrypted),
            s.SmsEnabled, s.SmsAccountSid, !string.IsNullOrEmpty(s.SmsAuthTokenEncrypted), s.SmsFromNumber,
            s.MaxFailedLoginAttempts, s.LockoutMinutes, s.EmailOtpMinutes, s.BackupCodeCount,
            s.WhatsAppAlertsEnabled, !string.IsNullOrEmpty(s.WhatsAppAccessTokenEncrypted),
            s.WhatsAppPhoneNumberId, s.WhatsAppAlertToNumber, s.UpdatedAt);
    }

    public async Task<SettingsView> ApplyAsync(UpdateSettingsRequest r)
    {
        var s = Clone(_current);

        if (r.SiteTitle is not null) s.SiteTitle = r.SiteTitle.Trim();
        if (r.EmailTwoFactorEnabled is { } e2) s.EmailTwoFactorEnabled = e2;
        if (r.SmsTwoFactorEnabled is { } s2) s.SmsTwoFactorEnabled = s2;
        if (r.WhatsAppTwoFactorEnabled is { } wa2fa) s.WhatsAppTwoFactorEnabled = wa2fa;

        if (r.EmailEnabled is { } ee) s.EmailEnabled = ee;
        if (r.EmailHost is not null) s.EmailHost = r.EmailHost.Trim();
        if (r.EmailPort is { } ep) s.EmailPort = ep;
        if (r.EmailUseStartTls is { } tls) s.EmailUseStartTls = tls;
        if (r.EmailFromAddress is not null) s.EmailFromAddress = r.EmailFromAddress.Trim();
        if (r.EmailFromName is not null) s.EmailFromName = r.EmailFromName.Trim();
        if (r.EmailUsername is not null) s.EmailUsername = r.EmailUsername.Trim();
        if (!string.IsNullOrEmpty(r.EmailPassword)) s.EmailPasswordEncrypted = _protector.Encrypt(r.EmailPassword);

        if (r.SmsEnabled is { } se) s.SmsEnabled = se;
        if (r.SmsAccountSid is not null) s.SmsAccountSid = r.SmsAccountSid.Trim();
        if (!string.IsNullOrEmpty(r.SmsAuthToken)) s.SmsAuthTokenEncrypted = _protector.Encrypt(r.SmsAuthToken);
        if (r.SmsFromNumber is not null) s.SmsFromNumber = r.SmsFromNumber.Trim();

        if (r.MaxFailedLoginAttempts is { } mfa) s.MaxFailedLoginAttempts = mfa;
        if (r.LockoutMinutes is { } lm) s.LockoutMinutes = lm;
        if (r.EmailOtpMinutes is { } eom) s.EmailOtpMinutes = eom;
        if (r.BackupCodeCount is { } bcc) s.BackupCodeCount = bcc;

        if (r.WhatsAppAlertsEnabled is { } wae) s.WhatsAppAlertsEnabled = wae;
        if (!string.IsNullOrEmpty(r.WhatsAppAccessToken)) s.WhatsAppAccessTokenEncrypted = _protector.Encrypt(r.WhatsAppAccessToken);
        if (r.WhatsAppPhoneNumberId is not null) s.WhatsAppPhoneNumberId = r.WhatsAppPhoneNumberId.Trim();
        if (r.WhatsAppAlertToNumber is not null) s.WhatsAppAlertToNumber = r.WhatsAppAlertToNumber.Trim();

        s.UpdatedAt = DateTime.UtcNow;
        await SaveAsync(s);
        return ToView();
    }

    // ---- Backup export / import (secrets stay AES-encrypted in the JSON) ----
    public string ExportJson() =>
        JsonSerializer.Serialize(_current, new JsonSerializerOptions { WriteIndented = true });

    public async Task ImportJsonAsync(string json)
    {
        var imported = JsonSerializer.Deserialize<AppSettings>(json)
            ?? throw new InvalidOperationException("Invalid settings file.");
        imported.Id = AppSettings.SingletonId;
        imported.UpdatedAt = DateTime.UtcNow;
        await SaveAsync(imported);
    }

    private async Task SaveAsync(AppSettings settings)
    {
        await _db.Settings.ReplaceOneAsync(s => s.Id == AppSettings.SingletonId, settings,
            new ReplaceOptions { IsUpsert = true });
        _current = settings;
    }

    private static AppSettings Clone(AppSettings s) => new()
    {
        Id = s.Id, SiteTitle = s.SiteTitle,
        EmailTwoFactorEnabled = s.EmailTwoFactorEnabled, SmsTwoFactorEnabled = s.SmsTwoFactorEnabled,
        WhatsAppTwoFactorEnabled = s.WhatsAppTwoFactorEnabled,
        EmailEnabled = s.EmailEnabled, EmailHost = s.EmailHost, EmailPort = s.EmailPort,
        EmailUseStartTls = s.EmailUseStartTls, EmailFromAddress = s.EmailFromAddress,
        EmailFromName = s.EmailFromName, EmailUsername = s.EmailUsername,
        EmailPasswordEncrypted = s.EmailPasswordEncrypted,
        SmsEnabled = s.SmsEnabled, SmsAccountSid = s.SmsAccountSid,
        SmsAuthTokenEncrypted = s.SmsAuthTokenEncrypted, SmsFromNumber = s.SmsFromNumber,
        MaxFailedLoginAttempts = s.MaxFailedLoginAttempts, LockoutMinutes = s.LockoutMinutes,
        EmailOtpMinutes = s.EmailOtpMinutes, BackupCodeCount = s.BackupCodeCount,
        AccessTokenMinutes = s.AccessTokenMinutes, RefreshTokenDays = s.RefreshTokenDays,
        TwoFactorTokenMinutes = s.TwoFactorTokenMinutes,
        WhatsAppAlertsEnabled = s.WhatsAppAlertsEnabled,
        WhatsAppAccessTokenEncrypted = s.WhatsAppAccessTokenEncrypted,
        WhatsAppPhoneNumberId = s.WhatsAppPhoneNumberId,
        WhatsAppAlertToNumber = s.WhatsAppAlertToNumber,
    };
}
