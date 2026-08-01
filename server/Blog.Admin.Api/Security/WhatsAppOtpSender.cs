using KeshavSingh.Auth.Abstractions;
using KeshavSingh.Core;

namespace Blog.Admin.Api.Services;

/// <summary>Delivers the WhatsApp-fallback 2FA OTP via the same Meta Cloud API notifier used for security alerts.</summary>
public sealed class WhatsAppOtpSender : IWhatsAppSender
{
    private readonly WhatsAppNotifier _notifier;
    public WhatsAppOtpSender(WhatsAppNotifier notifier) => _notifier = notifier;

    public Task SendOtpAsync(string toPhone, string code, CancellationToken ct = default) =>
        _notifier.SendMessageToAsync(toPhone, $"Your verification code is {code}. It expires shortly.", ct);
}
