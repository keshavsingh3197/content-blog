import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map, shareReplay } from 'rxjs/operators';
import { FileNode } from '../models/file-node.model';

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
    const searchRecursive = (items: FileNode[]) => {
      for (const node of items) {
        if (!node.isDirectory && node.name.toLowerCase().includes(q)) {
          results.push(node);
        }
        if (node.children) searchRecursive(node.children);
      }
    };
    searchRecursive(nodes);
    return results;
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
