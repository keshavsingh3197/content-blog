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
