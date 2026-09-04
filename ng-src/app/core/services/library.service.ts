import { Injectable, computed, effect, signal } from '@angular/core';
import { normalizeContentPath } from '../content-path';

/** A document the reader saved, or one they have opened. */
export interface LibraryEntry {
  /** Content path, e.g. `src/CSharp/01-intro.md`. Always a value that passed the path allowlist. */
  path: string;
  /** Display title as the reader saw it — a filename-derived label if the document had no title. */
  title: string;
  /** Epoch milliseconds: when it was saved (bookmarks) or last opened (history). */
  at: number;
}

const BOOKMARKS_KEY = 'blog.bookmarks';
const HISTORY_KEY = 'blog.history';

/** How much history to keep. Long enough to be a memory, short enough to stay a shortlist. */
const HISTORY_LIMIT = 24;

/**
 * The reader's own shelf: documents they bookmarked, and the ones they have read.
 *
 * This is deliberately **browser-local**. The blog has no reader accounts — commenting borrows the
 * family SSO session, and most visitors are signed out — so a server-side reading list would be a
 * new identity surface for a convenience feature. `localStorage` keeps it private to the device and
 * costs nothing when the reader clears it.
 *
 * Every access is guarded: a browser that blocks site data throws on the accessor itself, and this
 * service is injected during bootstrap, so an unguarded read takes the whole site down over a
 * bookmark list. Failure degrades to an empty, in-memory shelf that still works for the session.
 *
 * Stored paths are re-validated through {@link normalizeContentPath} on the way *in and out*:
 * `localStorage` is writable by anything running on this origin, so a stored value is untrusted
 * input exactly like a query string, and it ends up in a router link.
 */
@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly bookmarksSignal = signal<LibraryEntry[]>(read(BOOKMARKS_KEY));
  private readonly historySignal = signal<LibraryEntry[]>(read(HISTORY_KEY));

  /** Saved documents, most recently saved first. */
  readonly bookmarks = this.bookmarksSignal.asReadonly();

  /** Documents opened before, most recent first. */
  readonly history = this.historySignal.asReadonly();

  readonly bookmarkCount = computed(() => this.bookmarksSignal().length);

  /** The single most recent read, for the home page's "continue reading" card. */
  readonly lastRead = computed<LibraryEntry | null>(() => this.historySignal()[0] ?? null);

  private readonly bookmarkPaths = computed(() => new Set(this.bookmarksSignal().map(e => e.path)));

  constructor() {
    effect(() => write(BOOKMARKS_KEY, this.bookmarksSignal()));
    effect(() => write(HISTORY_KEY, this.historySignal()));
  }

  isBookmarked(path: string): boolean {
    return this.bookmarkPaths().has(path);
  }

  /** Add or remove a bookmark. Returns the state it ended in, so a caller can report it. */
  toggleBookmark(path: string, title: string): boolean {
    const normalized = normalizeContentPath(path);
    if (!normalized) return false;

    if (this.isBookmarked(normalized)) {
      this.bookmarksSignal.update(list => list.filter(entry => entry.path !== normalized));
      return false;
    }

    const entry: LibraryEntry = { path: normalized, title: title || normalized, at: Date.now() };
    this.bookmarksSignal.update(list => [entry, ...list]);
    return true;
  }

  removeBookmark(path: string): void {
    this.bookmarksSignal.update(list => list.filter(entry => entry.path !== path));
  }

  clearBookmarks(): void {
    this.bookmarksSignal.set([]);
  }

  /**
   * Record that a document was opened. Re-reading moves it to the front rather than adding a second
   * row, so the list stays a set of documents ordered by recency, not a visit log.
   */
  recordRead(path: string, title: string): void {
    const normalized = normalizeContentPath(path);
    if (!normalized) return;

    const entry: LibraryEntry = { path: normalized, title: title || normalized, at: Date.now() };
    this.historySignal.update(list =>
      [entry, ...list.filter(existing => existing.path !== normalized)].slice(0, HISTORY_LIMIT)
    );
  }

  /**
   * Update the stored title for a document already in either list. The reader saves a document
   * before its `<h1>` has rendered, so the first title recorded is often the filename-derived one.
   */
  refreshTitle(path: string, title: string): void {
    if (!title) return;
    const rename = (list: LibraryEntry[]) =>
      list.some(e => e.path === path && e.title !== title)
        ? list.map(e => (e.path === path ? { ...e, title } : e))
        : list;

    this.bookmarksSignal.update(rename);
    this.historySignal.update(rename);
  }

  clearHistory(): void {
    this.historySignal.set([]);
  }
}

/** Parse a stored list, dropping anything that is not a well-formed entry for a real content path. */
function read(key: string): LibraryEntry[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return [];
  }
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item): LibraryEntry[] => {
      if (!item || typeof item !== 'object') return [];
      const candidate = item as Partial<LibraryEntry>;
      const path = normalizeContentPath(typeof candidate.path === 'string' ? candidate.path : null);
      if (!path) return [];
      return [{
        path,
        title: typeof candidate.title === 'string' && candidate.title ? candidate.title : path,
        at: typeof candidate.at === 'number' && Number.isFinite(candidate.at) ? candidate.at : 0,
      }];
    });
  } catch {
    // A corrupted value is not worth surfacing — the shelf simply starts empty.
    return [];
  }
}

function write(key: string, entries: LibraryEntry[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(entries));
  } catch {
    // Quota exceeded or storage blocked: the list still works for this session.
  }
}
