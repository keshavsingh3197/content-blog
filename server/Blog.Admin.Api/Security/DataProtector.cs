using System.Security.Cryptography;
using System.Text;
using Blog.Admin.Api.Configuration;
using Microsoft.Extensions.Options;

namespace Blog.Admin.Api.Security;

/// <summary>
/// Authenticated symmetric encryption for secrets held at rest (e.g. TOTP shared
/// secrets), using AES-256-GCM. The 256-bit key comes from configuration/Key Vault
/// and is never persisted with the data. Output layout (Base64): nonce | tag | ciphertext.
/// </summary>
public sealed class DataProtector
{
    private const int NonceSize = 12; // 96-bit nonce, the GCM standard.
    private const int TagSize = 16;   // 128-bit auth tag.
    private readonly byte[] _key;

    public DataProtector(IOptions<EncryptionOptions> options)
    {
        var raw = options.Value.DataKey;
        if (string.IsNullOrWhiteSpace(raw))
            throw new InvalidOperationException(
                "Encryption:DataKey is not configured. Provide a Base64-encoded 32-byte key " +
                "via user-secrets, the Encryption__DataKey environment variable, or Key Vault.");

        try { _key = Convert.FromBase64String(raw); }
        catch (FormatException) { throw new InvalidOperationException("Encryption:DataKey must be Base64."); }

        if (_key.Length != 32)
            throw new InvalidOperationException("Encryption:DataKey must decode to exactly 32 bytes (AES-256).");
    }

    public string Encrypt(string plaintext)
    {
        var plain = Encoding.UTF8.GetBytes(plaintext);
        var nonce = RandomNumberGenerator.GetBytes(NonceSize);
        var cipher = new byte[plain.Length];
        var tag = new byte[TagSize];

        using var aes = new AesGcm(_key, TagSize);
        aes.Encrypt(nonce, plain, cipher, tag);

        var output = new byte[NonceSize + TagSize + cipher.Length];
        Buffer.BlockCopy(nonce, 0, output, 0, NonceSize);
        Buffer.BlockCopy(tag, 0, output, NonceSize, TagSize);
        Buffer.BlockCopy(cipher, 0, output, NonceSize + TagSize, cipher.Length);
        return Convert.ToBase64String(output);
    }

    public string Decrypt(string protectedValue)
    {
        var data = Convert.FromBase64String(protectedValue);
        if (data.Length < NonceSize + TagSize)
            throw new CryptographicException("Ciphertext is malformed.");

        var nonce = data.AsSpan(0, NonceSize);
        var tag = data.AsSpan(NonceSize, TagSize);
        var cipher = data.AsSpan(NonceSize + TagSize);
        var plain = new byte[cipher.Length];

        using var aes = new AesGcm(_key, TagSize);
        aes.Decrypt(nonce, cipher, tag, plain);
        return Encoding.UTF8.GetString(plain);
    }
}
