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
        shareReplay(1),
        catchError(() => of(''))
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
}
