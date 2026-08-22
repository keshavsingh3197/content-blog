using Blog.Admin.Api.Content;
using Blog.Admin.Api.Data;
using Blog.Admin.Api.Dtos;
using Blog.Admin.Api.Models;
using Blog.Admin.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MongoDB.Driver;

namespace Blog.Admin.Api.Controllers;

/// <summary>
/// How many people have read a document.
///
/// This is the public, per-page counter shown next to the reading time — distinct from the private
/// analytics the identity provider collects. It counts readers, not page loads: a repeat view from
/// the same visitor inside the de-duplication window does not increment, enforced by a unique index
/// rather than by trusting the browser.
/// </summary>
[ApiController]
[Route("api/page-stats")]
[AllowAnonymous]
public sealed class PageStatsController : ControllerBase
{
    private readonly MongoContext _db;
    private readonly VisitorKeyService _visitors;

    public PageStatsController(MongoContext db, VisitorKeyService visitors)
    {
        _db = db;
        _visitors = visitors;
    }

    /// <summary>The current total for one document. Returns zero rather than 404 for an uncounted page.</summary>
    [HttpGet]
    public async Task<ActionResult<PageStatDto>> Get([FromQuery] string path, CancellationToken ct)
    {
        if (!ContentPath.TryNormalize(path, out var contentPath))
            return BadRequest(new { error = "Unknown document path." });

        var stat = await _db.PageStats.Find(s => s.Path == contentPath).FirstOrDefaultAsync(ct);
        return Ok(new PageStatDto(contentPath, stat?.Views ?? 0));
    }

    /// <summary>
    /// Record that this visitor read the document, and return the resulting total.
    ///
    /// The insert into the hit collection is the de-duplication: its unique (path, visitor) index
    /// rejects a second write inside the window, so two tabs opened at once cannot both increment.
    /// </summary>
    [HttpPost("view")]
    [EnableRateLimiting("page-views")]
    public async Task<ActionResult<PageStatDto>> TrackView(TrackPageViewRequest request, CancellationToken ct)
    {
        if (!ContentPath.TryNormalize(request.Path, out var contentPath))
            return BadRequest(new { error = "Unknown document path." });

        var counted = true;
        try
        {
            await _db.PageViewHits.InsertOneAsync(new PageViewHit
            {
                Path = contentPath,
                VisitorKey = _visitors.For(Request),
            }, cancellationToken: ct);
        }
        catch (MongoWriteException e) when (e.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            // Already counted this visitor for this page within the window — return the total as is.
            counted = false;
        }

        if (!counted)
        {
            var existing = await _db.PageStats.Find(s => s.Path == contentPath).FirstOrDefaultAsync(ct);
            return Ok(new PageStatDto(contentPath, existing?.Views ?? 0));
        }

        var stat = await _db.PageStats.FindOneAndUpdateAsync<PageStat>(
            s => s.Path == contentPath,
            Builders<PageStat>.Update
                .Inc(s => s.Views, 1)
                .Set(s => s.UpdatedAt, DateTime.UtcNow)
                .SetOnInsert(s => s.Path, contentPath),
            new FindOneAndUpdateOptions<PageStat>
            {
                IsUpsert = true,
                ReturnDocument = ReturnDocument.After,
            },
            ct);

        return Ok(new PageStatDto(contentPath, stat.Views));
    }
}
