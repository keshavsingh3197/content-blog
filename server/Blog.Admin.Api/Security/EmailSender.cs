using System.Net;
using System.Net.Mail;
using Blog.Admin.Api.Configuration;
using Microsoft.Extensions.Options;

namespace Blog.Admin.Api.Services;

public interface IEmailSender
{
    Task SendOtpAsync(string toEmail, string code, CancellationToken ct = default);
}

/// <summary>
/// Sends the email-fallback OTP over SMTP with STARTTLS. When email is disabled
/// (e.g. local dev) the code is logged instead of sent so the flow stays testable
/// without wiring a mail provider. The OTP is not personal data; no other user
/// data is included.
/// </summary>
public sealed class SmtpEmailSender : IEmailSender
{
    private readonly EmailOptions _opts;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IOptions<EmailOptions> options, ILogger<SmtpEmailSender> logger)
    {
        _opts = options.Value;
        _logger = logger;
    }

    public async Task SendOtpAsync(string toEmail, string code, CancellationToken ct = default)
    {
        if (!_opts.Enabled || string.IsNullOrWhiteSpace(_opts.Host))
        {
            // Dev fallback: surface the code in logs only. Never do this in production.
            _logger.LogWarning("Email disabled — OTP for {Email} is {Code} (valid briefly).", toEmail, code);
            return;
        }

        using var message = new MailMessage
        {
            From = new MailAddress(_opts.FromAddress, _opts.FromName),
            Subject = "Your sign-in verification code",
            Body = $"Your verification code is {code}. It expires shortly. " +
                   "If you did not try to sign in, ignore this message.",
            IsBodyHtml = false,
        };
        message.To.Add(toEmail);

        using var client = new SmtpClient(_opts.Host, _opts.Port)
        {
            EnableSsl = _opts.UseStartTls, // STARTTLS — no plaintext credentials on the wire.
            DeliveryMethod = SmtpDeliveryMethod.Network,
            Credentials = string.IsNullOrEmpty(_opts.Username)
                ? CredentialCache.DefaultNetworkCredentials
                : new NetworkCredential(_opts.Username, _opts.Password),
        };

        await client.SendMailAsync(message, ct);
    }
}
