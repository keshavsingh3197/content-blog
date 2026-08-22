using System.Text.RegularExpressions;

namespace Blog.Admin.Api.Content;

/// <summary>
/// The one place that decides whether a caller-supplied string names a document on this blog.
///
/// Comments and view counts are keyed by content path, and that key arrives from the browser, so it
/// is a trust boundary: an allowlist pattern (not a denylist of bad characters), a length cap, and an
/// explicit rejection of traversal segments. A path that does not match is never stored, never used
/// to build a filter, and never echoed back.
/// </summary>
public static partial class ContentPath
{
    /// <summary>Longest path we will accept. The real tree tops out around 60 characters.</summary>
    public const int MaxLength = 300;

    /// <summary>
    /// `src/Folder Name/sub/document.md` — letters, digits, space, dot, underscore and hyphen in
    /// each segment, one of the readable content extensions at the end. Anchored on both sides.
    /// </summary>
    [GeneratedRegex(@"^src/(?:[A-Za-z0-9 ._-]+/)*[A-Za-z0-9 ._-]+\.(?:md|markdown|txt|html?|json)$",
        RegexOptions.CultureInvariant)]
    private static partial Regex Allowed();

    /// <summary>
    /// True when <paramref name="path"/> names a document, and hands back the trimmed value to
    /// store. False for anything else — including a traversal attempt, which the segment pattern
    /// would already reject but is checked explicitly so the intent is not just implied.
    /// </summary>
    public static bool TryNormalize(string? path, out string normalized)
    {
        normalized = string.Empty;
        if (string.IsNullOrWhiteSpace(path)) return false;

        var candidate = path.Trim();
        if (candidate.Length > MaxLength) return false;
        if (candidate.Contains("..", StringComparison.Ordinal)) return false;
        if (candidate.Contains('\\', StringComparison.Ordinal)) return false;
        if (!Allowed().IsMatch(candidate)) return false;

        normalized = candidate;
        return true;
    }
}
