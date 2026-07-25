using System.Text;
using System.Text.RegularExpressions;
using Blog.Admin.Api.Data;
using Blog.Admin.Api.Dtos;
using Blog.Admin.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace Blog.Admin.Api.Controllers;

[ApiController]
[Route("api/content")]
[Authorize] // Any signed-in user may read; writes require Editor or Admin.
public sealed partial class ContentController : ControllerBase
{
    private const string CanWrite = $"{Roles.Admin},{Roles.Editor}";
    private readonly MongoContext _db;

    public ContentController(MongoContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ContentListItem>>> List([FromQuery] string? folder, [FromQuery] string? q)
    {
        var filter = Builders<ContentTopic>.Filter.Empty;
        if (!string.IsNullOrWhiteSpace(folder))
            filter &= Builders<ContentTopic>.Filter.Eq(c => c.Folder, folder.Trim());
        if (!string.IsNullOrWhiteSpace(q))
        {
            // Escape the user input so it is treated as a literal, not a regex.
            var safe = Regex.Escape(q.Trim());
            filter &= Builders<ContentTopic>.Filter.Regex(c => c.Title,
                new MongoDB.Bson.BsonRegularExpression(safe, "i"));
        }

        var items = await _db.Content.Find(filter)
            .SortBy(c => c.Folder).ThenBy(c => c.Order).ThenBy(c => c.Title).ToListAsync();
        return Ok(items.Select(Map).ToList());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ContentTopic>> Get(string id)
    {
        var item = await _db.Content.Find(c => c.Id == id).FirstOrDefaultAsync();
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Roles = CanWrite)]
    public async Task<ActionResult<ContentTopic>> Create(CreateContentRequest request)
    {
        var folder = (request.Folder ?? string.Empty).Trim().Trim('/');
        var slug = Slugify(string.IsNullOrWhiteSpace(request.Slug) ? request.Title : request.Slug!);

        var clash = await _db.Content.Find(c => c.Folder == folder && c.Slug == slug).AnyAsync();
        if (clash) return Conflict(new { error = "A topic with that slug already exists in this folder." });

        var topic = new ContentTopic
        {
            Title = request.Title.Trim(),
            Slug = slug,
            Folder = folder,
            Body = request.Body ?? string.Empty,
            Tags = CleanTags(request.Tags),
            Order = request.Order,
            Published = request.Published,
            CreatedByUserId = User.GetUserId(),
            UpdatedByUserId = User.GetUserId(),
        };
        await _db.Content.InsertOneAsync(topic);
        return CreatedAtAction(nameof(Get), new { id = topic.Id }, topic);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = CanWrite)]
    public async Task<ActionResult<ContentTopic>> Update(string id, UpdateContentRequest request)
    {
        var update = Builders<ContentTopic>.Update
            .Set(c => c.UpdatedAt, DateTime.UtcNow)
            .Set(c => c.UpdatedByUserId, User.GetUserId());

        if (request.Title is not null) update = update.Set(c => c.Title, request.Title.Trim());
        if (request.Slug is not null) update = update.Set(c => c.Slug, Slugify(request.Slug));
        if (request.Folder is not null) update = update.Set(c => c.Folder, request.Folder.Trim().Trim('/'));
        if (request.Body is not null) update = update.Set(c => c.Body, request.Body);
        if (request.Tags is not null) update = update.Set(c => c.Tags, CleanTags(request.Tags));
        if (request.Order is { } order) update = update.Set(c => c.Order, order);
        if (request.Published is { } pub) update = update.Set(c => c.Published, pub);

        var item = await _db.Content.FindOneAndUpdateAsync<ContentTopic>(c => c.Id == id, update,
            new FindOneAndUpdateOptions<ContentTopic> { ReturnDocument = ReturnDocument.After });
        return item is null ? NotFound() : Ok(item);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = CanWrite)]
    public async Task<IActionResult> Delete(string id)
    {
        var result = await _db.Content.DeleteOneAsync(c => c.Id == id);
        return result.DeletedCount == 0 ? NotFound() : NoContent();
    }

    private static ContentListItem Map(ContentTopic c) =>
        new(c.Id, c.Title, c.Slug, c.Folder, c.Tags, c.Order, c.Published, c.UpdatedAt);

    private static List<string> CleanTags(List<string>? tags) => tags is null
        ? new List<string>()
        : tags.Select(t => t.Trim().ToLowerInvariant())
              .Where(t => t.Length is > 0 and <= 40).Distinct().Take(20).ToList();

    private static string Slugify(string input)
    {
        var lowered = input.Trim().ToLowerInvariant();
        var sb = new StringBuilder(lowered.Length);
        foreach (var ch in lowered)
        {
            if (char.IsLetterOrDigit(ch)) sb.Append(ch);
            else if (ch is ' ' or '-' or '_' or '.') sb.Append('-');
        }
        var slug = SlugDashes().Replace(sb.ToString(), "-").Trim('-');
        return slug.Length == 0 ? "untitled" : slug;
    }

    [GeneratedRegex("-{2,}")]
    private static partial Regex SlugDashes();
}
