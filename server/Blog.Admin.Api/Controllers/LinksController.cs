using Blog.Admin.Api.Data;
using Blog.Admin.Api.Dtos;
using Blog.Admin.Api.Models;
using KeshavSingh.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace Blog.Admin.Api.Controllers;

[ApiController]
[Route("api/links")]
public sealed class LinksController : ControllerBase
{
    private const string CanWrite = $"{Roles.Admin},{Roles.Editor}";
    // "Viewer or above": a plain SSO-family token with no console role must not see hidden links.
    private const string CanRead = $"{Roles.Viewer},{Roles.Editor},{Roles.Admin}";
    private readonly MongoContext _db;

    public LinksController(MongoContext db) => _db = db;

    /// <summary>
    /// Public list of visible links for the blog, projected to <see cref="LinkDto"/>. Callers with
    /// a console role (Viewer+) may pass ?all=true to also see hidden links, and get the full
    /// documents back for management.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IReadOnlyList<LinkDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult> List([FromQuery] bool all = false)
    {
        var hasConsoleRole = User.Identity?.IsAuthenticated == true &&
            (User.IsInRole(Roles.Viewer) || User.IsInRole(Roles.Editor) || User.IsInRole(Roles.Admin));
        var includeHidden = all && hasConsoleRole;
        if (all && !includeHidden) return Forbid();
        var filter = includeHidden ? Builders<Link>.Filter.Empty
                                   : Builders<Link>.Filter.Eq(l => l.Visible, true);

        var links = await _db.Links.Find(filter)
            .SortBy(l => l.Category).ThenBy(l => l.Order).ThenBy(l => l.Title).ToListAsync();

        // The management view needs visibility and the audit trail; the anonymous one must not
        // hand out identity-provider user ids, so it only ever sees the projection.
        return includeHidden ? Ok(links) : Ok(links.Select(ToDto).ToList());
    }

    [HttpGet("{id:objectid}")]
    [Authorize(Roles = CanRead)]
    public async Task<ActionResult<Link>> Get(string id)
    {
        var link = await _db.Links.Find(l => l.Id == id).FirstOrDefaultAsync();
        return link is null ? NotFound() : Ok(link);
    }

    [HttpPost]
    [Authorize(Roles = CanWrite)]
    public async Task<ActionResult<Link>> Create(CreateLinkRequest request)
    {
        var link = new Link
        {
            Title = request.Title.Trim(),
            Url = request.Url.Trim(),
            Category = Clean(request.Category),
            Description = Clean(request.Description),
            Icon = Clean(request.Icon),
            Order = request.Order,
            Visible = request.Visible,
            CreatedByUserId = User.GetUserId(),
            UpdatedByUserId = User.GetUserId(),
        };
        await _db.Links.InsertOneAsync(link);
        return CreatedAtAction(nameof(Get), new { id = link.Id }, link);
    }

    [HttpPut("{id:objectid}")]
    [Authorize(Roles = CanWrite)]
    public async Task<ActionResult<Link>> Update(string id, UpdateLinkRequest request)
    {
        var update = Builders<Link>.Update
            .Set(l => l.UpdatedAt, DateTime.UtcNow)
            .Set(l => l.UpdatedByUserId, User.GetUserId());

        if (request.Title is not null) update = update.Set(l => l.Title, request.Title.Trim());
        if (request.Url is not null) update = update.Set(l => l.Url, request.Url.Trim());
        if (request.Category is not null) update = update.Set(l => l.Category, Clean(request.Category));
        if (request.Description is not null) update = update.Set(l => l.Description, Clean(request.Description));
        if (request.Icon is not null) update = update.Set(l => l.Icon, Clean(request.Icon));
        if (request.Order is { } order) update = update.Set(l => l.Order, order);
        if (request.Visible is { } visible) update = update.Set(l => l.Visible, visible);

        var link = await _db.Links.FindOneAndUpdateAsync<Link>(l => l.Id == id, update,
            new FindOneAndUpdateOptions<Link> { ReturnDocument = ReturnDocument.After });
        return link is null ? NotFound() : Ok(link);
    }

    [HttpDelete("{id:objectid}")]
    [Authorize(Roles = CanWrite)]
    public async Task<IActionResult> Delete(string id)
    {
        var result = await _db.Links.DeleteOneAsync(l => l.Id == id);
        return result.DeletedCount == 0 ? NotFound() : NoContent();
    }

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static LinkDto ToDto(Link l) =>
        new(l.Id, l.Title, l.Url, l.Category, l.Description, l.Icon, l.Order);
}
