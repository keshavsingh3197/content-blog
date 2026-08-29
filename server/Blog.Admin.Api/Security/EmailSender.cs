using System.Net;
using System.Net.Mail;
using KeshavSingh.Auth.Abstractions;

namespace Blog.Admin.Api.Services;

/// <summary>
/// Sends the email-fallback OTP over SMTP with STARTTLS, using settings managed in
/// the admin UI (the password is decrypted from the DB at send time). When email is
/// disabled the code is logged instead so the flow stays testable. The OTP is not
/// personal data; no other user data is included.
/// </summary>
public sealed class SmtpEmailSender : IEmailSender
{
    private readonly SettingsService _settings;
    private readonly ILogger<SmtpEmailSender> _logger;
    private readonly IWebHostEnvironment _env;

    public SmtpEmailSender(SettingsService settings, ILogger<SmtpEmailSender> logger, IWebHostEnvironment env)
    {
        _settings = settings;
        _logger = logger;
        _env = env;
    }

    public async Task SendOtpAsync(string toEmail, string code, CancellationToken ct = default)
    {
        var s = _settings.Current;
        if (!s.EmailEnabled || string.IsNullOrWhiteSpace(s.EmailHost))
        {
            // Dev-only fallback: surface the code in the logs so local sign-in stays testable.
            // Never log a live OTP outside development.
            if (_env.IsDevelopment())
                _logger.LogWarning("Email disabled — OTP for {Email} is {Code} (valid briefly).", toEmail, code);
            return;
        }

        using var message = new MailMessage
        {
            From = new MailAddress(s.EmailFromAddress, s.EmailFromName),
            Subject = "Your sign-in verification code",
            Body = $"Your verification code is {code}. It expires shortly. " +
                   "If you did not try to sign in, ignore this message.",
            IsBodyHtml = false,
        };
        message.To.Add(toEmail);

        using var client = new SmtpClient(s.EmailHost, s.EmailPort)
        {
            EnableSsl = s.EmailUseStartTls, // STARTTLS — no plaintext credentials on the wire.
            DeliveryMethod = SmtpDeliveryMethod.Network,
            Credentials = string.IsNullOrEmpty(s.EmailUsername)
                ? CredentialCache.DefaultNetworkCredentials
                : new NetworkCredential(s.EmailUsername, _settings.EmailPassword ?? string.Empty),
        };

        await client.SendMailAsync(message, ct);
    }
}
