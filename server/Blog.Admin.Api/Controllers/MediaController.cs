using System.Security.Cryptography;
using Blog.Admin.Api.Configuration;
using Blog.Admin.Api.Data;
using Blog.Admin.Api.Dtos;
using Blog.Admin.Api.Models;
using KeshavSingh.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace Blog.Admin.Api.Controllers;

[ApiController]
[Route("api/media")]
[Authorize]
public sealed class MediaController : ControllerBase
{
    private const string CanWrite = $"{Roles.Admin},{Roles.Editor}";
    private static readonly Dictionary<string, string> ExtByType = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/png"] = ".png",
        ["image/jpeg"] = ".jpg",
        ["image/gif"] = ".gif",
        ["image/webp"] = ".webp",
        ["image/svg+xml"] = ".svg",
    };

    private readonly MongoContext _db;
    private readonly MediaOptions _opts;
    private readonly string _storageRoot;

    public MediaController(MongoContext db, IOptions<MediaOptions> opts, IWebHostEnvironment env)
    {
        _db = db;
        _opts = opts.Value;
        _storageRoot = Path.Combine(env.ContentRootPath, _opts.StoragePath);
        Directory.CreateDirectory(_storageRoot);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MediaListItem>>> List()
    {
        var items = await _db.Media.Find(FilterDefinition<MediaAsset>.Empty)
            .SortByDescending(m => m.CreatedAt).ToListAsync();
        return Ok(items.Select(Map).ToList());
    }

    [HttpPost]
    [Authorize(Roles = CanWrite)]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<ActionResult<MediaListItem>> Upload(IFormFile file)
    {
        // Validate at the boundary with an allowlist of type and size.
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No file was uploaded." });
        if (file.Length > _opts.MaxFileBytes)
            return BadRequest(new { error = $"File exceeds the {_opts.MaxFileBytes / 1024 / 1024} MB limit." });
        if (!_opts.AllowedContentTypes.Contains(file.ContentType) ||
            !ExtByType.TryGetValue(file.ContentType, out var ext))
            return BadRequest(new { error = "Unsupported file type." });

        // Never trust the client filename for the path. Use a random on-disk name.
        var storedName = $"{Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant()}{ext}";
        var fullPath = Path.Combine(_storageRoot, storedName);
        await using (var stream = System.IO.File.Create(fullPath))
            await file.CopyToAsync(stream);

        var asset = new MediaAsset
        {
            FileName = Path.GetFileName(file.FileName), // Display only; stripped of any path.
            StoredName = storedName,
            ContentType = file.ContentType,
            Size = file.Length,
            UploadedByUserId = User.GetUserId(),
        };
        await _db.Media.InsertOneAsync(asset);
        return CreatedAtAction(nameof(Raw), new { id = asset.Id }, Map(asset));
    }

    /// <summary>
    /// Serves the stored bytes. Anonymous by design: blog media is public content
    /// that the rendered site (and &lt;img&gt; tags) must load without a token. The
    /// id is a random ObjectId, so URLs are not guessable, and only allow-listed
    /// image types are ever stored.
    /// </summary>
    [HttpGet("{id}/raw")]
    [AllowAnonymous]
    public async Task<IActionResult> Raw(string id)
    {
        var asset = await _db.Media.Find(m => m.Id == id).FirstOrDefaultAsync();
        if (asset is null) return NotFound();

        var fullPath = Path.Combine(_storageRoot, asset.StoredName);
        // Defence in depth: ensure the resolved path stays inside the storage root.
        if (!Path.GetFullPath(fullPath).StartsWith(Path.GetFullPath(_storageRoot), StringComparison.Ordinal)
            || !System.IO.File.Exists(fullPath))
            return NotFound();

        // Neutralise any script embedded in an uploaded SVG if opened directly.
        Response.Headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
        // Public image meant to be embedded from the (cross-site) frontend, so relax
        // the global same-site CORP to allow <img> loads from another origin.
        Response.Headers["Cross-Origin-Resource-Policy"] = "cross-origin";
        return PhysicalFile(fullPath, asset.ContentType);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = CanWrite)]
    public async Task<IActionResult> Delete(string id)
    {
        var asset = await _db.Media.Find(m => m.Id == id).FirstOrDefaultAsync();
        if (asset is null) return NotFound();

        var fullPath = Path.Combine(_storageRoot, asset.StoredName);
        if (System.IO.File.Exists(fullPath)) System.IO.File.Delete(fullPath);
        await _db.Media.DeleteOneAsync(m => m.Id == id);
        return NoContent();
    }

    private MediaListItem Map(MediaAsset m) =>
        new(m.Id, m.FileName, m.ContentType, m.Size, $"/api/media/{m.Id}/raw", m.CreatedAt);
}
