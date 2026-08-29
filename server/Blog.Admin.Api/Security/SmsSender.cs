using System.Net.Http.Headers;
using System.Text;
using KeshavSingh.Auth.Abstractions;

namespace Blog.Admin.Api.Services;

/// <summary>
/// Sends the SMS-fallback OTP via a Twilio-compatible REST endpoint using only
/// HttpClient (no extra dependency), with credentials managed in the admin UI (the
/// auth token is decrypted from the DB at send time). When disabled the code is
/// logged instead so the flow stays testable.
/// </summary>
public sealed class TwilioSmsSender : ISmsSender
{
    private readonly SettingsService _settings;
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<TwilioSmsSender> _logger;
    private readonly IWebHostEnvironment _env;

    public TwilioSmsSender(SettingsService settings, IHttpClientFactory httpFactory,
        ILogger<TwilioSmsSender> logger, IWebHostEnvironment env)
    {
        _settings = settings;
        _httpFactory = httpFactory;
        _logger = logger;
        _env = env;
    }

    public async Task SendOtpAsync(string toPhone, string code, CancellationToken ct = default)
    {
        var s = _settings.Current;
        if (!s.SmsEnabled || string.IsNullOrWhiteSpace(s.SmsAccountSid))
        {
            // Dev-only fallback: surface the code in the logs so local sign-in stays testable.
            // Never log a live OTP outside development.
            if (_env.IsDevelopment())
                _logger.LogWarning("SMS disabled — OTP for {Phone} is {Code} (valid briefly).", toPhone, code);
            return;
        }

        var client = _httpFactory.CreateClient();
        var url = $"https://api.twilio.com/2010-04-01/Accounts/{s.SmsAccountSid}/Messages.json";
        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("To", toPhone),
                new KeyValuePair<string, string>("From", s.SmsFromNumber),
                new KeyValuePair<string, string>("Body", $"Your verification code is {code}. It expires shortly."),
            }),
        };
        var basic = Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{s.SmsAccountSid}:{_settings.SmsAuthToken}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", basic);

        var response = await client.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            // Surface Twilio's error detail (e.g. code 21606 "The From phone number is not a
            // valid, SMS-capable Twilio number") in the logs, but don't crash the request —
            // the login UI only shows a generic "code sent if a phone is on file" message.
            var body = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("Twilio SMS send failed ({Status}): {Body}", (int)response.StatusCode, body);
        }
    }
}
