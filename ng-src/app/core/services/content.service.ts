import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, catchError, map, shareReplay } from 'rxjs/operators';
import { FileNode, TagSummary } from '../models/file-node.model';
import { normalizeContentPath } from '../content-path';
import { parseDocName } from '../utils/doc-name';

/** One ranked search result. `title` is what the reader will see, already resolved. */
export interface SearchHit {
  node: FileNode;
  title: string;
  /** Higher is a better match; only meaningful relative to the other hits in the same search. */
  score: number;
  /** Tags that matched a search term, so the result can show *why* it was returned. */
  matchedTags: string[];
}

/** True when `term` starts a word in `text` — "core" matching "ASP.NET Core" but not "hardcore". */
function wordStarts(text: string, term: string): boolean {
  let index = text.indexOf(term);
  while (index >= 0) {
    if (index === 0 || /[^a-z0-9]/.test(text[index - 1])) return true;
    index = text.indexOf(term, index + 1);
  }
  return false;
}

/** The `key: value` pairs of a markdown front-matter block, as authored. */
export interface FrontMatter {
  title?: string;
  summary?: string;
  updated?: string;
  tags: string[];
}

@Injectable({ providedIn: 'root' })
export class ContentService {
  private structureSubject = new BehaviorSubject<FileNode[]>([]);
  structure$ = this.structureSubject.asObservable();

  /** In-memory cache: path → shared Observable<string> */
  private fileCache = new Map<string, Observable<string>>();

  /** Shared in-flight/settled structure request, so simultaneous subscribers issue one fetch. */
  private structureRequest$?: Observable<FileNode[]>;

  constructor(private http: HttpClient) {}

  getStructure(): Observable<FileNode[]> {
    if (this.structureSubject.getValue().length > 0) {
      return this.structure$;
    }
    // Navbar, home, search and content-view all ask for the structure during the same tick, so the
    // request is shared: without this each of them issues its own structure.json fetch. A failure
    // drops the shared handle so the next caller retries rather than replaying an empty tree —
    // the same discipline getFile() applies to fileCache.
    this.structureRequest$ ??= this.http.get<FileNode>('structure.json').pipe(
      map(root => root.children ?? []),
      tap({
        next: data => this.structureSubject.next(data),
        error: () => { this.structureRequest$ = undefined; },
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
      catchError(() => of([] as FileNode[]))
    );
    return this.structureRequest$;
  }

  getFile(path: string): Observable<string> {
    // The path reaches us from the query string, so re-check it here as well as at the route: this
    // is the call that turns a string into an HTTP request, and an unanchored value would fetch
    // (and then render) markdown from somewhere that is not this blog.
    if (!normalizeContentPath(path)) {
      return throwError(() => new Error('Not a content path.'));
    }
    if (!this.fileCache.has(path)) {
      const req$ = this.http.get(path, { responseType: 'text' }).pipe(
        tap({ error: () => this.fileCache.delete(path) }),
        shareReplay(1)
      );
      this.fileCache.set(path, req$);
    }
    return this.fileCache.get(path)!;
  }

  /**
   * Rank the library against `query`.
   *
   * The old predicate answered "does this string appear anywhere in the node" and returned matches
   * in tree order, which put `src/AWS/…` above an exact title hit further down. Scoring instead
   * lets the obvious answer come first: a title that *starts* with what was typed beats a title
   * that merely contains it, which beats a tag, which beats a path fragment. Every term has to
   * match something (AND, not OR), so a second word narrows a search rather than widening it.
   *
   * Everything here reads `structure.json`, which is already in memory — no document is fetched, so
   * searching stays instant and works offline exactly as it does online.
   */
  searchDocuments(query: string, nodes: FileNode[], limit = 40): SearchHit[] {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];

    const hits: SearchHit[] = [];

    const walk = (items: FileNode[]) => {
      for (const node of items) {
        if (!node.isDirectory) {
          const scored = this.scoreDocument(node, terms);
          if (scored) hits.push(scored);
        }
        if (node.children) walk(node.children);
      }
    };
    walk(nodes);

    return hits
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, limit);
  }

  /** A hit for `node`, or null when any term fails to match. */
  private scoreDocument(node: FileNode, terms: string[]): SearchHit | null {
    const title = node.title || parseDocName(node.name).title;
    const haystacks = {
      title: title.toLowerCase(),
      name: node.name.toLowerCase(),
      summary: (node.summary ?? '').toLowerCase(),
      path: node.path.toLowerCase(),
      tags: (node.tags ?? []).map(tag => tag.toLowerCase()),
    };

    let score = 0;
    const matchedTags = new Set<string>();

    for (const term of terms) {
      let best = 0;

      if (haystacks.title === term) best = Math.max(best, 120);
      else if (haystacks.title.startsWith(term)) best = Math.max(best, 90);
      else if (wordStarts(haystacks.title, term)) best = Math.max(best, 70);
      else if (haystacks.title.includes(term)) best = Math.max(best, 45);

      for (const tag of haystacks.tags) {
        if (tag === term) { best = Math.max(best, 60); matchedTags.add(tag); }
        else if (tag.startsWith(term)) { best = Math.max(best, 40); matchedTags.add(tag); }
      }

      if (haystacks.name.includes(term)) best = Math.max(best, 30);
      if (haystacks.summary.includes(term)) best = Math.max(best, 25);
      if (haystacks.path.includes(term)) best = Math.max(best, 12);

      // AND across terms: a document that matches "kubernetes" but not "network" is not a hit for
      // "kubernetes network", however strongly it matched the first word.
      if (best === 0) return null;
      score += best;
    }

    // A shorter title containing the same match is the more precise answer, so break ties toward it.
    score += Math.max(0, 24 - title.length / 4);

    return {
      node,
      title,
      score,
      matchedTags: [...matchedTags],
    };
  }

  // ── Front matter ────────────────────────────────────────────────────────────────────────────
  //
  // `generate_structure.py` already lifted this into structure.json, but the reader parses it
  // again from the file it just downloaded: that is the copy the visitor is actually looking at,
  // and it stays right even when someone edits a document without regenerating the navigation.

  /** Matches a leading `---` fenced block, and only at the very start of the document. */
  private static readonly FRONT_MATTER = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

  /** The document body with its front-matter block removed, so the fence is never rendered. */
  stripFrontMatter(markdown: string): string {
    return markdown.replace(ContentService.FRONT_MATTER, '');
  }

  /**
   * Read the front-matter block. Mirrors the generator's small hand-rolled reader: scalars and
   * one-level lists only, and anything unparseable is skipped rather than thrown — a typo in one
   * document must not blank the page it is on.
   */
  parseFrontMatter(markdown: string): FrontMatter {
    const block = ContentService.FRONT_MATTER.exec(markdown)?.[1];
    if (!block) return { tags: [] };

    const values = new Map<string, string | string[]>();
    let pendingListKey: string | null = null;

    for (const rawLine of block.split('\n')) {
      const line = rawLine.trimEnd();
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (pendingListKey && trimmed.startsWith('- ')) {
        (values.get(pendingListKey) as string[]).push(this.unquote(trimmed.slice(2)));
        continue;
      }

      const colon = line.indexOf(':');
      if (colon < 0) continue;

      const key = line.slice(0, colon).trim().toLowerCase();
      const value = line.slice(colon + 1).trim();
      pendingListKey = null;

      if (!value) {
        values.set(key, []);
        pendingListKey = key;
      } else if (value.startsWith('[')) {
        values.set(key, this.splitInlineList(value));
      } else {
        values.set(key, this.unquote(value));
      }
    }

    const scalar = (key: string): string | undefined => {
      const value = values.get(key);
      return typeof value === 'string' && value ? value : undefined;
    };

    const rawTags = values.get('tags');
    const tags = (Array.isArray(rawTags) ? rawTags : typeof rawTags === 'string' ? [rawTags] : [])
      .map(tag => tag.trim())
      .filter(Boolean);

    return {
      title: scalar('title'),
      summary: scalar('summary') ?? scalar('description'),
      updated: scalar('updated') ?? scalar('date'),
      tags: this.dedupeTags(tags),
    };
  }

  private unquote(value: string): string {
    const trimmed = value.trim();
    const quoted = trimmed.length >= 2 && trimmed[0] === trimmed[trimmed.length - 1] &&
      (trimmed[0] === '"' || trimmed[0] === "'");
    return quoted ? trimmed.slice(1, -1) : trimmed;
  }

  private splitInlineList(value: string): string[] {
    const inner = value.trim().replace(/^\[/, '').replace(/\]$/, '');
    return inner.split(',').map(part => this.unquote(part)).filter(Boolean);
  }

  /** Case-insensitive de-duplication that keeps the author's spelling and order. */
  private dedupeTags(tags: string[]): string[] {
    const seen = new Set<string>();
    return tags.filter(tag => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ── Tags ────────────────────────────────────────────────────────────────────────────────────

  /**
   * URL-safe form of a tag. Two spellings that differ only in case or punctuation share a slug, so
   * `C#` and `c#` are one tag — but `.NET` and `dotnet` are deliberately two, because collapsing
   * them would silently merge things the author kept apart.
   */
  static tagSlug(tag: string): string {
    return tag
      .trim()
      .toLowerCase()
      .replace(/[^\w.+#-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untagged';
  }

  /** Every tag in the tree with its document count, most-used first, then alphabetical. */
  buildTagIndex(nodes: FileNode[]): TagSummary[] {
    const index = new Map<string, TagSummary>();

    const walk = (items: FileNode[]) => {
      for (const node of items) {
        if (!node.isDirectory) {
          for (const tag of node.tags ?? []) {
            const slug = ContentService.tagSlug(tag);
            const existing = index.get(slug);
            if (existing) existing.count++;
            else index.set(slug, { label: tag, slug, count: 1 });
          }
        }
        if (node.children) walk(node.children);
      }
    };

    walk(nodes);
    return [...index.values()].sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label)
    );
  }

  /** Every document carrying `slug`, ordered by path so a numbered series stays in sequence. */
  filesWithTag(slug: string, nodes: FileNode[]): FileNode[] {
    const wanted = ContentService.tagSlug(slug);
    const results: FileNode[] = [];

    const walk = (items: FileNode[]) => {
      for (const node of items) {
        if (!node.isDirectory && (node.tags ?? []).some(t => ContentService.tagSlug(t) === wanted)) {
          results.push(node);
        }
        if (node.children) walk(node.children);
      }
    };

    walk(nodes);
    return results.sort((a, b) => a.path.localeCompare(b.path));
  }

  /** Every document in the tree, in tree order. */
  allDocuments(nodes: FileNode[]): FileNode[] {
    const documents: FileNode[] = [];
    const walk = (items: FileNode[]) => {
      for (const node of items) {
        if (!node.isDirectory) documents.push(node);
        if (node.children) walk(node.children);
      }
    };
    walk(nodes);
    return documents;
  }

  /**
   * The most recently revised documents, newest first.
   *
   * `updated` is whatever the author typed in the front matter, so it is sorted as a string rather
   * than parsed: ISO dates (`2026-03-14`) sort correctly that way, and anything else at least
   * sorts consistently instead of becoming `Invalid Date`. Documents with no `updated` are left
   * out entirely — the section is "recently updated", and a document with no date is not a claim
   * about recency.
   */
  recentlyUpdated(nodes: FileNode[], limit = 6): FileNode[] {
    return this.allDocuments(nodes)
      .filter(node => !!node.updated)
      .sort((a, b) => (b.updated ?? '').localeCompare(a.updated ?? ''))
      .slice(0, limit);
  }

  /**
   * Documents worth reading next to `path`, ranked by how much of its tag set they share, with a
   * nudge for living in the same folder. Excludes the document itself.
   *
   * Tags are the only cross-cutting signal `structure.json` carries — the folder tree is a single
   * hierarchy, so without them "related" could only ever mean "adjacent".
   */
  relatedDocuments(path: string, nodes: FileNode[], limit = 4): FileNode[] {
    const source = this.findNodeByPath(path, nodes);
    if (!source) return [];

    const wanted = new Set((source.tags ?? []).map(tag => ContentService.tagSlug(tag)));
    if (!wanted.size) return [];

    const folder = path.slice(0, path.lastIndexOf('/'));

    return this.allDocuments(nodes)
      .filter(node => node.path !== path)
      .map(node => {
        const shared = (node.tags ?? []).filter(tag => wanted.has(ContentService.tagSlug(tag))).length;
        const sameFolder = folder && node.path.startsWith(`${folder}/`) ? 0.5 : 0;
        return { node, score: shared + sameFolder };
      })
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.node.path.localeCompare(b.node.path))
      .slice(0, limit)
      .map(entry => entry.node);
  }

  countFiles(nodes: FileNode[]): number {
    let count = 0;
    const countRecursive = (items: FileNode[]) => {
      for (const node of items) {
        if (!node.isDirectory) count++;
        if (node.children) countRecursive(node.children);
      }
    };
    countRecursive(nodes);
    return count;
  }

  findNodeByPath(path: string, nodes: FileNode[]): FileNode | null {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = this.findNodeByPath(path, node.children);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Rewrite relative **document** links so they navigate inside the SPA.
   *
   * A markdown link like `[next](Interview/01-intro.md)` is resolved by the browser against the
   * page URL, not against the markdown file — and because the app uses hash routing the page URL
   * is always the site root. The link therefore hits `/Interview/01-intro.md`, misses, falls
   * through to `404.html` and lands the reader back on the home page.
   *
   * Rewriting to `#/file?path=<resolved>` keeps the link a real href (hover preview, middle-click,
   * open-in-new-tab all still work) while routing through the app.
   */
  rewriteDocumentLinks(markdown: string, filePath: string): string {
    const baseDir = filePath.includes('/') ? filePath.slice(0, filePath.lastIndexOf('/')) : '';

    return this.mapOutsideCode(markdown, segment =>
      // (?<!!) keeps image links out of this — those are handled by rewriteImagePaths.
      segment.replace(/(?<!!)\[([^\]]*)\]\(\s*([^)\s]+)\s*\)/g, (match, text: string, href: string) => {
        if (this.isExternalOrInPage(href)) return match;

        const [rawPath, fragment] = this.splitFragment(href);
        if (!rawPath) return match;

        const resolved = rawPath.startsWith('/')
          ? `src${rawPath}`                                   // e.g. /CSharp/Asset/x.png
          : ContentService.resolveRelative(baseDir, rawPath);
        if (!resolved) return match;

        // An asset (image, PDF, …) has no reader page — link straight at the file so the
        // browser opens it, rather than routing to a folder that does not exist.
        if (ContentService.ASSET_FILE.test(resolved)) {
          return `[${text}](${resolved})`;
        }

        const route = ContentService.CONTENT_FILE.test(resolved) ? 'file' : 'folder';
        const suffix = fragment ? `#${fragment}` : '';
        return `[${text}](#/${route}?path=${encodeURIComponent(resolved)}${suffix})`;
      })
    );
  }

  /** File extensions the blog serves as readable content; anything else is treated as a folder. */
  private static readonly CONTENT_FILE = /\.(md|markdown|txt|html?|json)$/i;

  /** Binary assets that the browser opens directly rather than the markdown reader. */
  private static readonly ASSET_FILE = /\.(png|jpe?g|gif|svg|webp|avif|bmp|ico|pdf|zip|csv|xlsx?|docx?|pptx?|mp4|webm)$/i;

  private isExternalOrInPage(href: string): boolean {
    return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href);
  }

  private splitFragment(href: string): [string, string] {
    const hash = href.indexOf('#');
    return hash < 0 ? [href, ''] : [href.slice(0, hash), href.slice(hash + 1)];
  }

  /** Resolve `href` against `baseDir`, honouring `.` and `..` segments. */
  private static resolveRelative(baseDir: string, href: string): string {
    const segments = baseDir ? baseDir.split('/') : [];
    for (const part of href.split('/')) {
      if (part === '' || part === '.') continue;
      if (part === '..') segments.pop();
      else segments.push(part);
    }
    return segments.join('/');
  }

  /**
   * Apply `transform` to the prose only, leaving fenced blocks and inline code spans untouched —
   * otherwise a markdown example inside a ```markdown fence would be rewritten as if it were a
   * real link.
   */
  private mapOutsideCode(markdown: string, transform: (segment: string) => string): string {
    const fence = /^\s*(```+|~~~+)/;
    // Which delimiter opened the block we are in, or null outside one. A single boolean would
    // desync for the rest of the file the first time a ``` block is "closed" by ~~~ — or the
    // first time a fence appears inside another fence, which the CommonMark rule below allows.
    let openDelimiter: string | null = null;

    return markdown.split('\n').map(line => {
      const marker = fence.exec(line)?.[1];
      if (marker) {
        if (openDelimiter === null) {
          openDelimiter = marker;
        } else if (marker[0] === openDelimiter[0] && marker.length >= openDelimiter.length) {
          // A closing fence must use the same character and be at least as long as the opener.
          openDelimiter = null;
        }
        return line;
      }
      if (openDelimiter !== null) return line;

      // Mask inline code spans so their contents are never transformed.
      const spans: string[] = [];
      const masked = line.replace(/`[^`]*`/g, span => {
        spans.push(span);
        return `\u0000${spans.length - 1}\u0000`;
      });

      return transform(masked).replace(/\u0000(\d+)\u0000/g, (_m, i) => spans[Number(i)]);
    }).join('\n');
  }

  /** Rewrite relative image paths in markdown so they resolve correctly when
   *  the markdown file lives at `filePath` (e.g. "src/API/API.md"). */
  rewriteImagePaths(markdown: string, filePath: string): string {
    const lastSlash = filePath.lastIndexOf('/');
    const baseDir = lastSlash >= 0 ? filePath.substring(0, lastSlash) : '';
    // Prose only, like rewriteDocumentLinks: an ![alt](path) example inside a ```markdown fence is
    // something the reader is meant to see verbatim, not a real image to resolve.
    return this.mapOutsideCode(markdown, segment =>
      segment.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, src: string) => {
        if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('//')) {
          return `![${alt}](${src})`;
        }
        if (src.startsWith('./')) {
          const resolved = baseDir ? `${baseDir}/${src.slice(2)}` : src.slice(2);
          return `![${alt}](${resolved})`;
        }
        if (src.startsWith('/')) {
          // Absolute path missing the 'src/' prefix (e.g. /CSharp/Asset/...)
          return `![${alt}](src${src})`;
        }
        // Plain relative path without leading './'
        const resolved = baseDir ? `${baseDir}/${src}` : src;
        return `![${alt}](${resolved})`;
      })
    );
  }
}
