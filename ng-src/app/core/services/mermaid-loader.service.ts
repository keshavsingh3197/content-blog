import { Injectable } from '@angular/core';

/**
 * Loads the Mermaid bundle on demand.
 *
 * Mermaid is ~3.5 MB minified — far too large to sit in `angular.json > scripts`,
 * where it would be pulled down on every page view and blow the 2 MB initial budget.
 * ngx-markdown looks for a **global** `mermaid` object, so the bundle is copied into
 * `assets/mermaid/` at build time and injected as a plain `<script>` the first time a
 * markdown file actually contains a ```mermaid block.
 */
@Injectable({ providedIn: 'root' })
export class MermaidLoaderService {
  private static readonly SCRIPT_PATH = 'assets/mermaid/mermaid.min.js';

  private loading?: Promise<boolean>;

  /** True when a markdown document contains at least one mermaid fence. */
  static hasDiagram(markdown: string): boolean {
    return /^[ \t]*(```|~~~)\s*mermaid\b/m.test(markdown);
  }

  /** Resolves `true` once the global `mermaid` object is available, `false` if it cannot load. */
  load(): Promise<boolean> {
    if ((window as any).mermaid) return Promise.resolve(true);
    if (this.loading) return this.loading;

    this.loading = new Promise<boolean>(resolve => {
      // Resolve against <base href> so it works on GitHub Pages sub-paths too.
      const src = new URL(MermaidLoaderService.SCRIPT_PATH, document.baseURI).href;
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve(!!(window as any).mermaid);
      script.onerror = () => {
        // Let the page render the diagram source as plain text rather than failing outright.
        this.loading = undefined;
        resolve(false);
      };
      document.head.appendChild(script);
    });

    return this.loading;
  }
}
