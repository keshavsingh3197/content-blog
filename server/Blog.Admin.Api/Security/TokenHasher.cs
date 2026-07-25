using System.Security.Cryptography;
using System.Text;

namespace Blog.Admin.Api.Security;

/// <summary>
/// SHA-256 hashing for high-entropy secrets (refresh tokens, backup codes, email
/// OTPs) so only hashes are stored. SHA-256 is appropriate here because these
/// values are random and high-entropy — unlike passwords, they do not need a slow
/// KDF. Also generates cryptographically random opaque tokens and numeric OTPs.
/// </summary>
public static class TokenHasher
{
    public static string Hash(string value)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes);
    }

    public static bool Verify(string value, string hash) =>
        CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(Hash(value)),
            Encoding.ASCII.GetBytes(hash));

    /// <summary>A URL-safe opaque token (256-bit) for refresh tokens / 2FA step tokens.</summary>
    public static string NewOpaqueToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');

    /// <summary>A numeric OTP of the given length, e.g. for the email fallback.</summary>
    public static string NewNumericOtp(int digits = 6)
    {
        var max = (int)Math.Pow(10, digits);
        var n = RandomNumberGenerator.GetInt32(max);
        return n.ToString().PadLeft(digits, '0');
    }

    /// <summary>A human-friendly backup code, e.g. "a1b2c-3d4e5".</summary>
    public static string NewBackupCode()
    {
        const string alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // No ambiguous chars.
        Span<char> chars = stackalloc char[11];
        for (var i = 0; i < 11; i++)
            chars[i] = i == 5 ? '-' : alphabet[RandomNumberGenerator.GetInt32(alphabet.Length)];
        return new string(chars);
    }
}
