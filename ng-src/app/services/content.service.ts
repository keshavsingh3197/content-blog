import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map, shareReplay } from 'rxjs/operators';
import { FileNode, TagSummary } from '../models/file-node.model';

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

  constructor(private http: HttpClient) {}

  getStructure(): Observable<FileNode[]> {
    if (this.structureSubject.getValue().length > 0) {
      return this.structure$;
    }
    return this.http.get<FileNode>('structure.json').pipe(
      map(root => root.children ?? []),
      tap(data => this.structureSubject.next(data)),
      catchError(() => of([]))
    );
  }

  getFile(path: string): Observable<string> {
    if (!this.fileCache.has(path)) {
      const req$ = this.http.get(path, { responseType: 'text' }).pipe(
        tap({ error: () => this.fileCache.delete(path) }),
        shareReplay(1)
      );
      this.fileCache.set(path, req$);
    }
    return this.fileCache.get(path)!;
  }

  searchFiles(query: string, nodes: FileNode[]): FileNode[] {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: FileNode[] = [];
    const matches = (node: FileNode) =>
      node.name.toLowerCase().includes(q) ||
      (node.title?.toLowerCase().includes(q) ?? false) ||
      (node.tags ?? []).some(tag => tag.toLowerCase().includes(q));

    const searchRecursive = (items: FileNode[]) => {
      for (const node of items) {
        if (!node.isDirectory && matches(node)) {
          results.push(node);
        }
        if (node.children) searchRecursive(node.children);
      }
    };
    searchRecursive(nodes);
    return results;
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
    const fence = /^\s*(```|~~~)/;
    let insideFence = false;

    return markdown.split('\n').map(line => {
      if (fence.test(line)) {
        insideFence = !insideFence;
        return line;
      }
      if (insideFence) return line;

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
    return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, src: string) => {
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
    });
  }
}
