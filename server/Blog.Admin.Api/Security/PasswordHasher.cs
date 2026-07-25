using System.Security.Cryptography;

namespace Blog.Admin.Api.Security;

/// <summary>
/// Password hashing using PBKDF2 (Rfc2898) with HMAC-SHA256. No deprecated
/// algorithms. Verification is constant-time. Hash format: "iterations.salt.hash"
/// (both segments Base64), which is self-describing so the cost can be raised later.
/// </summary>
public sealed class PasswordHasher
{
    private const int SaltSize = 16;        // 128-bit salt.
    private const int KeySize = 32;         // 256-bit derived key.
    private const int Iterations = 210_000; // OWASP-recommended floor for PBKDF2-SHA256.
    private static readonly HashAlgorithmName Algorithm = HashAlgorithmName.SHA256;

    public string Hash(string password)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(password);
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var key = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, Algorithm, KeySize);
        return $"{Iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(key)}";
    }

    public bool Verify(string password, string stored)
    {
        if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(stored)) return false;

        var parts = stored.Split('.', 3);
        if (parts.Length != 3 || !int.TryParse(parts[0], out var iterations)) return false;

        byte[] salt, expected;
        try
        {
            salt = Convert.FromBase64String(parts[1]);
            expected = Convert.FromBase64String(parts[2]);
        }
        catch (FormatException)
        {
            return false;
        }

        var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, Algorithm, expected.Length);
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}
