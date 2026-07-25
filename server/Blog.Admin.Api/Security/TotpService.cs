using System.Security.Cryptography;
using System.Text;

namespace Blog.Admin.Api.Security;

/// <summary>
/// RFC 6238 time-based one-time passwords for authenticator apps
/// (Google / Microsoft Authenticator, etc.).
///
/// NOTE ON HMAC-SHA1: TOTP is specified over HMAC-SHA1 and authenticator apps
/// default to it — using SHA-256 here would make codes mismatch on most apps.
/// This is HMAC (a keyed MAC), not SHA-1 used as a digest or signature: the SHA-1
/// collision weaknesses do not apply to HMAC-SHA1, which remains sound. This is a
/// deliberate, documented exception to the "no SHA-1" guideline for interop only.
/// </summary>
public sealed class TotpService
{
    private const int Digits = 6;
    private const int PeriodSeconds = 30;
    private const int WindowSteps = 1; // Accept the current step ±1 for clock drift.

    /// <summary>Generates a new Base32-encoded shared secret (160-bit).</summary>
    public string GenerateSecret()
    {
        var bytes = RandomNumberGenerator.GetBytes(20);
        return Base32.Encode(bytes);
    }

    /// <summary>Builds the otpauth:// URI an authenticator app scans from a QR code.</summary>
    public string BuildOtpAuthUri(string secretBase32, string issuer, string accountEmail)
    {
        var label = Uri.EscapeDataString($"{issuer}:{accountEmail}");
        var iss = Uri.EscapeDataString(issuer);
        return $"otpauth://totp/{label}?secret={secretBase32}&issuer={iss}&algorithm=SHA1&digits={Digits}&period={PeriodSeconds}";
    }

    /// <summary>Verifies a user-supplied code against the secret, tolerating clock drift.</summary>
    public bool VerifyCode(string secretBase32, string code)
    {
        if (string.IsNullOrWhiteSpace(code)) return false;
        code = code.Trim();
        if (code.Length != Digits || !code.All(char.IsDigit)) return false;

        byte[] key;
        try { key = Base32.Decode(secretBase32); }
        catch { return false; }

        var currentStep = DateTimeOffset.UtcNow.ToUnixTimeSeconds() / PeriodSeconds;
        for (var offset = -WindowSteps; offset <= WindowSteps; offset++)
        {
            var candidate = ComputeCode(key, currentStep + offset);
            // Constant-time compare to avoid leaking timing information.
            if (CryptographicOperations.FixedTimeEquals(
                    Encoding.ASCII.GetBytes(candidate), Encoding.ASCII.GetBytes(code)))
                return true;
        }
        return false;
    }

    private static string ComputeCode(byte[] key, long step)
    {
        var counter = BitConverter.GetBytes(step);
        if (BitConverter.IsLittleEndian) Array.Reverse(counter);

        using var hmac = new HMACSHA1(key); // See class note: required for authenticator interop.
        var hash = hmac.ComputeHash(counter);

        var offset = hash[^1] & 0x0F;
        var binary = ((hash[offset] & 0x7F) << 24)
                     | ((hash[offset + 1] & 0xFF) << 16)
                     | ((hash[offset + 2] & 0xFF) << 8)
                     | (hash[offset + 3] & 0xFF);

        var otp = binary % (int)Math.Pow(10, Digits);
        return otp.ToString().PadLeft(Digits, '0');
    }
}

/// <summary>Minimal RFC 4648 Base32 (no padding) used for TOTP secrets.</summary>
internal static class Base32
{
    private const string Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    public static string Encode(byte[] data)
    {
        var sb = new StringBuilder((data.Length + 4) / 5 * 8);
        int buffer = 0, bitsLeft = 0;
        foreach (var b in data)
        {
            buffer = (buffer << 8) | b;
            bitsLeft += 8;
            while (bitsLeft >= 5)
            {
                bitsLeft -= 5;
                sb.Append(Alphabet[(buffer >> bitsLeft) & 31]);
            }
        }
        if (bitsLeft > 0)
            sb.Append(Alphabet[(buffer << (5 - bitsLeft)) & 31]);
        return sb.ToString();
    }

    public static byte[] Decode(string input)
    {
        input = input.TrimEnd('=').ToUpperInvariant().Replace(" ", string.Empty);
        var bytes = new List<byte>(input.Length * 5 / 8);
        int buffer = 0, bitsLeft = 0;
        foreach (var c in input)
        {
            var index = Alphabet.IndexOf(c);
            if (index < 0) throw new FormatException("Invalid Base32 character.");
            buffer = (buffer << 5) | index;
            bitsLeft += 5;
            if (bitsLeft >= 8)
            {
                bitsLeft -= 8;
                bytes.Add((byte)((buffer >> bitsLeft) & 0xFF));
            }
        }
        return bytes.ToArray();
    }
}
