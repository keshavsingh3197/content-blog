using Blog.Admin.Api.Data;
using Blog.Admin.Api.Models;
using Microsoft.AspNetCore.Http;

namespace Blog.Admin.Api.Services;

/// <summary>
/// Records security events (auth attempts, authorization outcomes, 2FA changes)
/// with context. Deliberately excludes passwords, tokens, and other personal data.
/// </summary>
public sealed class AuditLogger
{
    private readonly MongoContext _db;
    private readonly IHttpContextAccessor _http;
    private readonly ILogger<AuditLogger> _logger;

    public AuditLogger(MongoContext db, IHttpContextAccessor http, ILogger<AuditLogger> logger)
    {
        _db = db;
        _http = http;
        _logger = logger;
    }

    public async Task LogAsync(string @event, bool success, string email, string? userId = null)
    {
        var ctx = _http.HttpContext;
        var entry = new LoginAudit
        {
            Event = @event,
            Success = success,
            Email = email,
            UserId = userId,
            IpAddress = ctx?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = ctx?.Request.Headers.UserAgent.ToString(),
        };

        try
        {
            await _db.Audit.InsertOneAsync(entry);
        }
        catch (Exception ex)
        {
            // Auditing must never break the request path, but the failure itself is notable.
            _logger.LogError(ex, "Failed to persist audit event {Event}", @event);
        }

        _logger.LogInformation("AUDIT {Event} success={Success} user={UserId} ip={Ip}",
            @event, success, userId, entry.IpAddress);
    }
}
