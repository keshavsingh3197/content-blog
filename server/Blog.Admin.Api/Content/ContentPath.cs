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
    /// The folder-or-document fragment a moderator can filter by: the same per-segment character
    /// allowlist, but with no extension requirement, so `CSharp` and `src/CSharp/Basics.md` are
    /// both acceptable. Anchored on both sides like the document pattern.
    /// </summary>
    [GeneratedRegex(@"^[A-Za-z0-9 ._-]+(?:/[A-Za-z0-9 ._-]+)*$", RegexOptions.CultureInvariant)]
    private static partial Regex AllowedFragment();

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

    /// <summary>
    /// True when <paramref name="fragment"/> is a usable filter over content paths — a folder
    /// (`CSharp`, `src/CSharp`) or a whole document. Hands back the `src/`-rooted form.
    ///
    /// Filtering is a weaker requirement than storing, so this accepts a folder where
    /// <see cref="TryNormalize"/> would not; it applies the same character allowlist, length cap
    /// and traversal rejection, so the value is still safe to turn into a query.
    /// </summary>
    public static bool TryNormalizeFilter(string? fragment, out string normalized)
    {
        normalized = string.Empty;
        if (string.IsNullOrWhiteSpace(fragment)) return false;

        var candidate = fragment.Trim().Trim('/');
        if (candidate.Length is 0 or > MaxLength) return false;
        if (candidate.Contains("..", StringComparison.Ordinal)) return false;
        if (candidate.Contains('\\', StringComparison.Ordinal)) return false;
        if (!AllowedFragment().IsMatch(candidate)) return false;

        // Stored paths are always `src/`-rooted, so a moderator typing just the folder name still
        // matches: "CSharp" filters the same set as "src/CSharp".
        normalized = candidate == "src" || candidate.StartsWith("src/", StringComparison.Ordinal)
            ? candidate
            : $"src/{candidate}";
        return true;
    }

    /// <summary>
    /// An anchored pattern matching <paramref name="normalizedFilter"/> and everything beneath it.
    /// The value is escaped, so nothing a caller types can act as a regex metacharacter.
    /// </summary>
    public static string ToFilterPattern(string normalizedFilter) =>
        $"^{Regex.Escape(normalizedFilter)}(?:/|$)";
}
