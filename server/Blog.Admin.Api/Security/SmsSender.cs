using System.Net.Http.Headers;
using System.Text;
using Blog.Admin.Api.Configuration;
using Microsoft.Extensions.Options;

namespace Blog.Admin.Api.Services;

public interface ISmsSender
{
    Task SendOtpAsync(string toPhone, string code, CancellationToken ct = default);
}

/// <summary>
/// Sends the SMS-fallback OTP via a Twilio-compatible REST endpoint using only
/// HttpClient (no extra dependency). When disabled (e.g. local dev) the code is
/// logged instead of sent so the flow stays testable. Credentials come from
/// configuration / Key Vault, never source.
/// </summary>
public sealed class TwilioSmsSender : ISmsSender
{
    private readonly SmsOptions _opts;
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<TwilioSmsSender> _logger;

    public TwilioSmsSender(IOptions<SmsOptions> options, IHttpClientFactory httpFactory,
        ILogger<TwilioSmsSender> logger)
    {
        _opts = options.Value;
        _httpFactory = httpFactory;
        _logger = logger;
    }

    public async Task SendOtpAsync(string toPhone, string code, CancellationToken ct = default)
    {
        if (!_opts.Enabled || string.IsNullOrWhiteSpace(_opts.AccountSid))
        {
            _logger.LogWarning("SMS disabled — OTP for {Phone} is {Code} (valid briefly).", toPhone, code);
            return;
        }

        var client = _httpFactory.CreateClient();
        var url = $"https://api.twilio.com/2010-04-01/Accounts/{_opts.AccountSid}/Messages.json";
        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("To", toPhone),
                new KeyValuePair<string, string>("From", _opts.FromNumber),
                new KeyValuePair<string, string>("Body", $"Your verification code is {code}. It expires shortly."),
            }),
        };
        var basic = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_opts.AccountSid}:{_opts.AuthToken}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", basic);

        var response = await client.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
    }
}
