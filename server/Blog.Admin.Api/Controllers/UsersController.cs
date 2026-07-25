using Blog.Admin.Api.Data;
using Blog.Admin.Api.Dtos;
using Blog.Admin.Api.Models;
using Blog.Admin.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace Blog.Admin.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize] // Default-deny: every endpoint requires a valid session; most require Admin.
public sealed class UsersController : ControllerBase
{
    private readonly MongoContext _db;
    private readonly PasswordHasher _passwords;

    public UsersController(MongoContext db, PasswordHasher passwords)
    {
        _db = db;
        _passwords = passwords;
    }

    /// <summary>The caller's own profile — available to any authenticated user.</summary>
    [HttpGet("me")]
    public async Task<ActionResult<UserProfile>> Me()
    {
        var user = await _db.Users.Find(u => u.Id == User.GetUserId()).FirstOrDefaultAsync();
        if (user is null) return Unauthorized();
        return Ok(new UserProfile(user.Id, user.Email, user.DisplayName, user.Roles, user.TwoFactorEnabled));
    }

    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<IReadOnlyList<UserListItem>>> List()
    {
        var users = await _db.Users.Find(FilterDefinition<User>.Empty)
            .SortBy(u => u.Email).ToListAsync();
        return Ok(users.Select(Map).ToList());
    }

    [HttpGet("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<UserListItem>> Get(string id)
    {
        var user = await _db.Users.Find(u => u.Id == id).FirstOrDefaultAsync();
        return user is null ? NotFound() : Ok(Map(user));
    }

    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<UserListItem>> Create(CreateUserRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var roles = NormalizeRoles(request.Roles);
        if (roles is null) return BadRequest(new { error = "One or more roles are invalid." });

        var exists = await _db.Users.Find(u => u.Email == email).AnyAsync();
        if (exists) return Conflict(new { error = "A user with that email already exists." });

        var user = new User
        {
            Email = email,
            DisplayName = request.DisplayName.Trim(),
            PasswordHash = _passwords.Hash(request.Password),
            Roles = roles,
        };
        await _db.Users.InsertOneAsync(user);
        return CreatedAtAction(nameof(Get), new { id = user.Id }, Map(user));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<UserListItem>> Update(string id, UpdateUserRequest request)
    {
        var update = Builders<User>.Update.Set(u => u.UpdatedAt, DateTime.UtcNow);

        if (request.DisplayName is not null)
            update = update.Set(u => u.DisplayName, request.DisplayName.Trim());

        if (request.Roles is not null)
        {
            var roles = NormalizeRoles(request.Roles);
            if (roles is null) return BadRequest(new { error = "One or more roles are invalid." });
            update = update.Set(u => u.Roles, roles);
        }

        if (request.IsActive is { } active)
        {
            update = update.Set(u => u.IsActive, active);
            // Deactivating a user immediately kills their sessions.
            if (!active)
                await _db.RefreshTokens.UpdateManyAsync(r => r.UserId == id && r.RevokedAt == null,
                    Builders<RefreshToken>.Update.Set(r => r.RevokedAt, DateTime.UtcNow));
        }

        var user = await _db.Users.FindOneAndUpdateAsync<User>(u => u.Id == id, update,
            new FindOneAndUpdateOptions<User> { ReturnDocument = ReturnDocument.After });
        return user is null ? NotFound() : Ok(Map(user));
    }

    [HttpPost("{id}/reset-password")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> ResetPassword(string id, ResetPasswordRequest request)
    {
        var result = await _db.Users.UpdateOneAsync(u => u.Id == id, Builders<User>.Update
            .Set(u => u.PasswordHash, _passwords.Hash(request.NewPassword))
            .Set(u => u.UpdatedAt, DateTime.UtcNow));
        if (result.MatchedCount == 0) return NotFound();

        // Force re-authentication everywhere after a password reset.
        await _db.RefreshTokens.UpdateManyAsync(r => r.UserId == id && r.RevokedAt == null,
            Builders<RefreshToken>.Update.Set(r => r.RevokedAt, DateTime.UtcNow));
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Delete(string id)
    {
        if (id == User.GetUserId())
            return BadRequest(new { error = "You cannot delete your own account." });

        var result = await _db.Users.DeleteOneAsync(u => u.Id == id);
        if (result.DeletedCount == 0) return NotFound();
        await _db.RefreshTokens.DeleteManyAsync(r => r.UserId == id);
        return NoContent();
    }

    [HttpGet("/api/roles")]
    [Authorize(Roles = Roles.Admin)]
    public ActionResult<IReadOnlyList<string>> ListRoles() => Ok(Roles.All.OrderBy(r => r).ToList());

    private static List<string>? NormalizeRoles(List<string>? roles)
    {
        if (roles is null || roles.Count == 0) return new List<string> { Models.Roles.Viewer };
        var normalized = roles.Distinct().ToList();
        return normalized.All(Models.Roles.IsValid) ? normalized : null;
    }

    private static UserListItem Map(User u) => new(
        u.Id, u.Email, u.DisplayName, u.Roles, u.IsActive, u.TwoFactorEnabled, u.LastLoginAt, u.CreatedAt);
}
