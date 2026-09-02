using System.Security.Cryptography;
using System.Text;
using KeshavSingh.Security;
using Microsoft.Extensions.Options;

namespace Blog.Admin.Api.Services;

/// <summary>
/// Turns a request into a stable, opaque per-visitor key for view de-duplication.
///
/// The inputs (IP address, user agent) are personal data, so nothing derived from them is reversible
/// and neither is ever stored: the key is a keyed HMAC using the application's existing data key, and
/// only the digest is written. Without the key the digest cannot be matched back to an address, and
/// the rows it appears in expire within hours.
/// </summary>
public sealed class VisitorKeyService
{
    private readonly byte[] _key;

    public VisitorKeyService(IOptions<EncryptionOptions> encryption)
    {
        var raw = encryption.Value.DataKey;
        if (string.IsNullOrWhiteSpace(raw))
            throw new InvalidOperationException(
                "Encryption:DataKey is not configured; it is required to key the visitor digest.");

        _key = Convert.FromBase64String(raw);
    }

    /// <summary>The digest for the current request. Never null — an unknown client still gets a key.</summary>
    public string For(HttpRequest request)
    {
        // Use the connection address only. UseForwardedHeaders (Program.cs, ForwardLimit = 1) has
        // already replaced it with the single hop Render's edge proxy vouched for, so this IS the
        // observed client address. Reading X-Forwarded-For here instead would take the left-most
        // entry — the part the *client* sends — and a caller varying that header would get a fresh
        // key on every request, so the unique (Path, VisitorKey) index would never dedupe and view
        // counts would be inflatable in a shell loop.
        var ip = request.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        var agent = request.Headers.UserAgent.ToString();
        var material = Encoding.UTF8.GetBytes($"{ip}|{agent}");
        return Convert.ToHexString(HMACSHA256.HashData(_key, material)).ToLowerInvariant();
    }
}
