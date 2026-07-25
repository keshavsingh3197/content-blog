using Blog.Admin.Api.Configuration;
using Blog.Admin.Api.Data;
using Blog.Admin.Api.Models;
using Blog.Admin.Api.Security;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace Blog.Admin.Api.Services;

/// <summary>
/// One-time bootstrap of the first Admin user, so a fresh database is usable.
/// The password comes from configuration/secrets (never committed). Skips silently
/// if no seed password is configured or the user already exists.
/// </summary>
public sealed class AdminSeeder
{
    private readonly MongoContext _db;
    private readonly PasswordHasher _passwords;
    private readonly SeedOptions _seed;
    private readonly ILogger<AdminSeeder> _logger;

    public AdminSeeder(MongoContext db, PasswordHasher passwords,
        IOptions<SeedOptions> seed, ILogger<AdminSeeder> logger)
    {
        _db = db;
        _passwords = passwords;
        _seed = seed.Value;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        if (string.IsNullOrWhiteSpace(_seed.AdminEmail) || string.IsNullOrWhiteSpace(_seed.AdminPassword))
        {
            _logger.LogInformation("Admin seed skipped (no Seed:AdminPassword configured).");
            return;
        }

        var email = _seed.AdminEmail.Trim().ToLowerInvariant();
        if (await _db.Users.Find(u => u.Email == email).AnyAsync())
        {
            _logger.LogInformation("Admin seed skipped — {Email} already exists.", email);
            return;
        }

        await _db.Users.InsertOneAsync(new User
        {
            Email = email,
            DisplayName = _seed.AdminDisplayName,
            PasswordHash = _passwords.Hash(_seed.AdminPassword),
            Roles = new List<string> { Roles.Admin },
        });
        _logger.LogWarning("Seeded initial Admin {Email}. Enroll 2FA and rotate the password now.", email);
    }
}
