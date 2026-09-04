import { Injectable, effect, signal } from '@angular/core';
import { FileNode } from '../../../core/models/file-node.model';

const STORAGE_KEY = 'blog.tree';

/**
 * Which folders of the home page's tree are open.
 *
 * Shared rather than per-component for two reasons: the tree component renders itself recursively,
 * so state held in an instance is destroyed whenever an ancestor collapses; and the expand-all /
 * collapse-all controls sit outside the tree entirely and need a handle on the same set.
 *
 * The set is remembered between visits — a reader who dug three levels into `src/CSharp` should
 * find it where they left it — with the usual guard around storage.
 */
@Injectable({ providedIn: 'root' })
export class TreeStateService {
  private readonly expanded = signal<ReadonlySet<string>>(read());

  constructor() {
    effect(() => write([...this.expanded()]));
  }

  isExpanded(path: string): boolean {
    return this.expanded().has(path);
  }

  toggle(path: string): void {
    this.expanded.update(current => {
      const next = new Set(current);
      if (!next.delete(path)) next.add(path);
      return next;
    });
  }

  /** Open every folder in `nodes`, at every depth. */
  expandAll(nodes: FileNode[]): void {
    const paths: string[] = [];
    const walk = (items: FileNode[]) => {
      for (const node of items) {
        if (!node.isDirectory) continue;
        paths.push(node.path);
        if (node.children) walk(node.children);
      }
    };
    walk(nodes);
    this.expanded.set(new Set(paths));
  }

  collapseAll(): void {
    this.expanded.set(new Set());
  }

  /** True when nothing is open — the expand/collapse control uses it to pick its own label. */
  get isAllCollapsed(): boolean {
    return this.expanded().size === 0;
  }
}

function read(): ReadonlySet<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : []);
  } catch {
    return new Set();
  }
}

function write(paths: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(paths));
  } catch {
    // Not persistable in this browser; the tree still expands normally for the session.
  }
}
