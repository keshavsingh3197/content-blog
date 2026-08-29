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
    // The media inventory (every upload) is only useful inside the console, so any console
    // viewer may see it, but a bare SSO-family token with no role must not.
    private const string CanRead = $"{Roles.Viewer},{Roles.Editor},{Roles.Admin}";
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
    [Authorize(Roles = CanRead)]
    public async Task<ActionResult<IReadOnlyList<MediaListItem>>> List([FromQuery] int limit = 200)
    {
        var items = await _db.Media.Find(FilterDefinition<MediaAsset>.Empty)
            .SortByDescending(m => m.CreatedAt)
            .Limit(Math.Clamp(limit, 1, 1000)).ToListAsync();
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

        // The declared ContentType alone is spoofable; verify the bytes on disk really are the
        // format it claims (raster types). SVG is text/XML and has no fixed magic — it is accepted
        // on the content allowlist and served with a sandboxing CSP header instead.
        if (ext != ".svg" && !MatchesImageSignature(fullPath, file.ContentType))
        {
            System.IO.File.Delete(fullPath);
            return BadRequest(new { error = "File contents do not match the declared image type." });
        }

        var asset = new MediaAsset
        {
            FileName = Path.GetFileName(file.FileName), // Display only; stripped of any path.
            StoredName = storedName,
            ContentType = file.ContentType,
            Size = file.Length,
            UploadedByUserId = User.GetUserId(),
        };
        try
        {
            await _db.Media.InsertOneAsync(asset);
        }
        catch
        {
            // A failed insert would otherwise leak an orphan file on disk.
            System.IO.File.Delete(fullPath);
            throw;
        }
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
        // Defence in depth: ensure the resolved path stays inside the storage root. GetRelativePath
        // is exact (no sibling-prefix false positive like StartsWith had).
        var fullRoot = Path.GetFullPath(_storageRoot);
        var relative = Path.GetRelativePath(fullRoot, Path.GetFullPath(fullPath));
        if (relative == ".." || relative.StartsWith($"..{Path.DirectorySeparatorChar}", StringComparison.Ordinal)
            || Path.IsPathRooted(relative) || !System.IO.File.Exists(fullPath))
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

        // Remove the authoritative DB row first, then best-effort the file. Leaving an orphan file
        // (file delete fails) is harmless; leaving a dangling row pointing at a deleted file is not.
        await _db.Media.DeleteOneAsync(m => m.Id == id);
        try
        {
            var fullPath = Path.Combine(_storageRoot, asset.StoredName);
            if (System.IO.File.Exists(fullPath)) System.IO.File.Delete(fullPath);
        }
        catch
        {
            // Orphan file only; the media inventory no longer references it.
        }
        return NoContent();
    }

    /// <summary>
    /// Cheap magic-byte check for the fixed-signature raster formats we accept. Returns false if
    /// the leading bytes don't match the declared MIME type, so a spoofed ContentType (e.g. an
    /// HTML payload uploaded as "image/png") is rejected rather than served.
    /// </summary>
    private static bool MatchesImageSignature(string path, string contentType)
    {
        Span<byte> head = stackalloc byte[16];
        int read;
        using (var stream = System.IO.File.OpenRead(path))
            read = stream.Read(head);
        if (read < 8) return false;

        static bool HasPrefix(ReadOnlySpan<byte> data, ReadOnlySpan<byte> sig) =>
            data.Length >= sig.Length && data[..sig.Length].SequenceEqual(sig);

        return contentType switch
        {
            "image/png" => HasPrefix(head, new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
            "image/jpeg" => HasPrefix(head, new byte[] { 0xFF, 0xD8, 0xFF }),
            "image/gif" => HasPrefix(head, new byte[] { 0x47, 0x49, 0x46, 0x38 }), // "GIF8"
            "image/webp" => read >= 12 && HasPrefix(head[..4], "RIFF"u8) && HasPrefix(head.Slice(8, 4), "WEBP"u8),
            _ => true, // svg and anything else: allowlist already filtered it.
        };
    }

    private MediaListItem Map(MediaAsset m) =>
        new(m.Id, m.FileName, m.ContentType, m.Size, $"/api/media/{m.Id}/raw", m.CreatedAt);
}
