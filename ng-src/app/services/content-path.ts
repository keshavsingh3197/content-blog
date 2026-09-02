/**
 * Client-side mirror of the API's `Content/ContentPath.TryNormalize`.
 *
 * Both the blog and the API key documents by a path that arrives from the browser (`#/file?path=…`),
 * so it is a trust boundary on this side too: without a check, `?path=https://evil.example/pwn.md`
 * makes the site fetch and render remote markdown inside its own chrome. Keep this predicate
 * byte-for-byte equivalent to the server's — the same allowlist pattern, the same length cap and the
 * same explicit traversal rejection — so a path either works in both places or neither.
 */

/** Longest path we will accept. The real tree tops out around 60 characters. */
export const CONTENT_PATH_MAX_LENGTH = 300;

/**
 * `src/Folder Name/sub/document.md` — letters, digits, space, dot, underscore and hyphen in each
 * segment, one of the readable content extensions at the end. Anchored on both sides, so an
 * absolute or protocol-relative URL cannot match.
 */
const ALLOWED = /^src\/(?:[A-Za-z0-9 ._-]+\/)*[A-Za-z0-9 ._-]+\.(?:md|markdown|txt|html?|json)$/;

/**
 * The trimmed path when it names a document on this blog, otherwise `null`. Traversal is rejected
 * explicitly even though the segment pattern already excludes it, so the intent is not just implied.
 */
export function normalizeContentPath(path: string | null | undefined): string | null {
  if (!path) return null;

  const candidate = path.trim();
  if (!candidate || candidate.length > CONTENT_PATH_MAX_LENGTH) return null;
  if (candidate.includes('..')) return null;
  if (candidate.includes('\\')) return null;
  if (!ALLOWED.test(candidate)) return null;

  return candidate;
}

/**
 * `src` or `src/Folder Name/sub` — the folder form of the same allowlist, for the `#/folder?path=…`
 * route. Folders have no extension, so they need their own pattern rather than the document one.
 */
const ALLOWED_FOLDER = /^src(?:\/[A-Za-z0-9 ._-]+)*$/;

/**
 * The trimmed path when it names a folder in the content tree, otherwise `null`. An empty value is
 * valid and stays empty — that is how the route asks for the root listing.
 */
export function normalizeFolderPath(path: string | null | undefined): string | null {
  const candidate = (path ?? '').trim();
  if (!candidate) return '';
  if (candidate.length > CONTENT_PATH_MAX_LENGTH) return null;
  if (candidate.includes('..')) return null;
  if (candidate.includes('\\')) return null;
  if (!ALLOWED_FOLDER.test(candidate)) return null;

  return candidate;
}
