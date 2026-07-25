using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Blog.Admin.Api.Configuration;
using Blog.Admin.Api.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Blog.Admin.Api.Security;

/// <summary>Issues signed JWT access tokens and short-lived two-factor step tokens (HS256).</summary>
public sealed class JwtService
{
    private readonly JwtOptions _opts;
    private readonly SymmetricSecurityKey _key;

    public const string TwoFactorPurpose = "2fa";
    public const string PurposeClaim = "purpose";

    public JwtService(IOptions<JwtOptions> options)
    {
        _opts = options.Value;
        if (string.IsNullOrWhiteSpace(_opts.SigningKey) ||
            Encoding.UTF8.GetByteCount(_opts.SigningKey) < 32)
            throw new InvalidOperationException(
                "Jwt:SigningKey is missing or too short. Provide at least a 32-byte key via " +
                "user-secrets, the Jwt__SigningKey environment variable, or Key Vault.");

        _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opts.SigningKey));
    }

    /// <summary>Full access token carrying the user's identity and roles.</summary>
    public (string token, DateTime expiresAt) CreateAccessToken(User user)
    {
        var expires = DateTime.UtcNow.AddMinutes(_opts.AccessTokenMinutes);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new("name", user.DisplayName),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
        };
        claims.AddRange(user.Roles.Select(r => new Claim(ClaimTypes.Role, r)));
        return (Write(claims, expires), expires);
    }

    /// <summary>Short-lived token proving the password step passed, pending 2FA.</summary>
    public string CreateTwoFactorToken(User user)
    {
        var expires = DateTime.UtcNow.AddMinutes(_opts.TwoFactorTokenMinutes);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(PurposeClaim, TwoFactorPurpose),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
        };
        return Write(claims, expires);
    }

    /// <summary>Validates a two-factor step token and returns the user id, or null.</summary>
    public string? ValidateTwoFactorToken(string token)
    {
        try
        {
            var principal = new JwtSecurityTokenHandler().ValidateToken(token, new TokenValidationParameters
            {
                ValidIssuer = _opts.Issuer,
                ValidAudience = _opts.Audience,
                IssuerSigningKey = _key,
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateIssuerSigningKey = true,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(30),
            }, out _);

            if (principal.FindFirst(PurposeClaim)?.Value != TwoFactorPurpose) return null;
            return principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        }
        catch
        {
            return null; // Fail closed on any validation error.
        }
    }

    public DateTime RefreshTokenExpiry() => DateTime.UtcNow.AddDays(_opts.RefreshTokenDays);

    private string Write(IEnumerable<Claim> claims, DateTime expires)
    {
        var creds = new SigningCredentials(_key, SecurityAlgorithms.HmacSha256);
        var jwt = new JwtSecurityToken(
            issuer: _opts.Issuer,
            audience: _opts.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expires,
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }
}
