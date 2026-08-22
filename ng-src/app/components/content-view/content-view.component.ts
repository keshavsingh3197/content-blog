import {
  Component, OnInit, OnDestroy, ElementRef, ViewChild,
  ChangeDetectionStrategy, ChangeDetectorRef, effect, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { MarkdownModule, MermaidAPI } from 'ngx-markdown';
import { ContentService } from '../../services/content.service';
import { MermaidLoaderService } from '../../services/mermaid-loader.service';
import { ThemeService } from '../../services/theme.service';
import { BreadcrumbComponent, BreadcrumbItem } from '../breadcrumb/breadcrumb.component';

export interface TocItem {
  level: number;
  text: string;
  id: string;
}

@Component({
  selector: 'app-content-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, BreadcrumbComponent, MarkdownModule],
  template: `
    <div class="container mt-4">
      <app-breadcrumb [items]="breadcrumbs"></app-breadcrumb>

      <!-- Skeleton loader -->
      <div class="content-skeleton" *ngIf="loading">
        <div class="skeleton-header"></div>
        <div class="skeleton-line w-75"></div>
        <div class="skeleton-line w-100"></div>
        <div class="skeleton-line w-90"></div>
        <div class="skeleton-line w-60"></div>
        <div class="skeleton-line w-100"></div>
        <div class="skeleton-line w-80"></div>
      </div>

      <div class="alert alert-danger" *ngIf="error">
        <i class="fas fa-exclamation-circle me-2"></i>{{ error }}
      </div>

      <div class="content-layout" *ngIf="!loading && !error">
        <!-- Mobile TOC (collapsible, shown only on small screens) -->
        <div class="mobile-toc" *ngIf="toc.length > 1">
          <button class="mobile-toc-toggle" (click)="tocOpen = !tocOpen" [attr.aria-expanded]="tocOpen">
            <i class="fas fa-list me-2"></i>Table of Contents
            <i class="fas ms-auto" [class.fa-chevron-down]="!tocOpen" [class.fa-chevron-up]="tocOpen"></i>
          </button>
          <nav class="mobile-toc-nav" [class.open]="tocOpen">
            <a
              *ngFor="let item of toc"
              [href]="'#' + item.id"
              class="toc-link"
              [class.toc-h1]="item.level === 1"
              [class.toc-h2]="item.level === 2"
              [class.toc-h3]="item.level === 3"
              (click)="scrollToHeading($event, item.id); tocOpen = false"
            >{{ item.text }}</a>
          </nav>
        </div>
        <!-- TOC sidebar (desktop) -->
        <aside class="toc-sidebar" *ngIf="toc.length > 1">
          <div class="toc-panel">
            <div class="toc-title"><i class="fas fa-list me-2"></i>Contents</div>
            <nav class="toc-nav">
              <a
                *ngFor="let item of toc"
                [href]="'#' + item.id"
                class="toc-link"
                [class.toc-h1]="item.level === 1"
                [class.toc-h2]="item.level === 2"
                [class.toc-h3]="item.level === 3"
                [class.toc-active]="activeTocId === item.id"
                (click)="scrollToHeading($event, item.id)"
              >{{ item.text }}</a>
            </nav>
          </div>
        </aside>

        <!-- Main content -->
        <div class="content-main">
          <div class="content-view-panel">
            <div class="content-meta">
              <span class="meta-item"><i class="fas fa-file-alt"></i>&nbsp;{{ fileName }}</span>
              <span class="meta-item"><i class="fas fa-clock"></i>&nbsp;{{ readingTime }} min read</span>
              <span class="meta-item"><i class="fas fa-align-left"></i>&nbsp;{{ wordCount }} words</span>
            </div>
            <div class="markdown-body" #contentDiv>
              <markdown
                [data]="content"
                [mermaid]="mermaidReady"
                [mermaidOptions]="mermaidOptions"
                (ready)="onMarkdownReady()"
              ></markdown>
            </div>
          </div>
        </div>
      </div>

      <!-- Back to top -->
      <button
        class="back-to-top"
        [class.visible]="showBackToTop"
        (click)="scrollToTop()"
        aria-label="Back to top"
      ><i class="fas fa-arrow-up"></i></button>
    </div>
  `
})
export class ContentViewComponent implements OnInit, OnDestroy {
  @ViewChild('contentDiv') contentDiv?: ElementRef<HTMLElement>;

  content = '';
  loading = true;
  error = '';
  fileName = '';
  wordCount = 0;
  readingTime = 0;
  breadcrumbs: BreadcrumbItem[] = [];
  toc: TocItem[] = [];
  activeTocId = '';
  showBackToTop = false;
  tocOpen = false;
  currentPath = '';

  /** Only true once the Mermaid bundle is on the page for a document that needs it. */
  mermaidReady = false;
  mermaidOptions: MermaidAPI.MermaidConfig = {
    startOnLoad: false,          // ngx-markdown calls mermaid.run() itself
    securityLevel: 'strict',     // no raw HTML / click handlers inside diagrams
    theme: 'default',
    fontFamily: 'inherit',
    // Required when a page holds more than one diagram. With random ids mermaid falls back to
    // Date.now(), so every diagram rendered in the same millisecond gets the SAME svg id — and
    // since each svg carries an id-scoped <style> plus url(#id) arrow markers, diagram #1 then
    // styles all the others. A deterministic generator increments instead, keeping ids unique.
    deterministicIds: true,
  };

  private readonly mermaidLoader = inject(MermaidLoaderService);
  private readonly themeService = inject(ThemeService);

  /** Diagrams bake their colours in at render time, so re-render them when the theme flips. */
  private readonly themeEffect = effect(() => {
    const dark = this.themeService.theme() === 'dark';
    this.mermaidOptions = { ...this.mermaidOptions, theme: dark ? 'dark' : 'default' };

    const markdown = this.content;
    if (!this.mermaidReady || !markdown) return;
    this.content = '';
    this.cdr.markForCheck();
    setTimeout(() => {
      this.content = markdown;
      this.cdr.markForCheck();
    });
  });

  private destroy$ = new Subject<void>();
  private scrollHandler = () => {
    this.showBackToTop = window.scrollY > 400;
    this.updateActiveToc();
    this.cdr.markForCheck();
  };

  constructor(
    private route: ActivatedRoute,
    private contentService: ContentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    window.addEventListener('scroll', this.scrollHandler, { passive: true });

    this.route.queryParams.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        const path = params['path'] || '';
        this.loading = true;
        this.error = '';
        this.content = '';
        this.toc = [];
        this.tocOpen = false;
        this.currentPath = path;
        this.buildBreadcrumbs(path);
        this.fileName = path.split('/').pop() || path;
        window.scrollTo({ top: 0, behavior: 'instant' });
        this.cdr.markForCheck();
        return this.contentService.getFile(path);
      })
    ).subscribe({
      next: (text) => {
        // Images first, then document links — relative hrefs would otherwise resolve against the
        // site root (hash routing) and fall through 404.html back to the home page.
        const withImages = this.contentService.rewriteImagePaths(text, this.currentPath);
        const rewritten = this.contentService.rewriteDocumentLinks(withImages, this.currentPath);
        this.wordCount = rewritten.split(/\s+/).filter(Boolean).length;
        this.readingTime = Math.ceil(this.wordCount / 200);

        if (!MermaidLoaderService.hasDiagram(rewritten)) {
          this.mermaidReady = false;
          this.show(rewritten);
          return;
        }

        // Hold the markdown back until the global `mermaid` object exists, otherwise
        // ngx-markdown renders the fence once as plain text and never revisits it.
        this.mermaidLoader.load().then(ok => {
          this.mermaidReady = ok;
          this.show(rewritten);
        });
      },
      error: () => {
        this.error = 'Failed to load file. Please try again.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private show(markdown: string): void {
    this.content = markdown;
    this.loading = false;
    this.cdr.markForCheck();
  }

  onMarkdownReady(): void {
    // Use a single rAF to avoid running in the CD cycle
    requestAnimationFrame(() => {
      this.processCodeBlocks();
      this.buildToc();       // assigns heading ids — must run before processLinks()
      this.processLinks();
      this.useHeadingAsBreadcrumbLabel();
      this.cdr.markForCheck();
    });
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  scrollToHeading(e: Event, id: string): void {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private updateActiveToc(): void {
    if (!this.toc.length) return;
    const headings = this.contentDiv?.nativeElement.querySelectorAll('h1,h2,h3') ?? [];
    let active = '';
    headings.forEach((h: Element) => {
      if (h.getBoundingClientRect().top <= 120) active = h.id;
    });
    if (active !== this.activeTocId) {
      this.activeTocId = active;
    }
  }

  private buildToc(): void {
    const el = this.contentDiv?.nativeElement;
    if (!el) return;
    const headings = el.querySelectorAll('h1,h2,h3');
    this.toc = Array.from(headings).map((h: Element) => {
      const level = parseInt(h.tagName[1], 10);
      const text = (h as HTMLElement).innerText.trim();
      let id = h.id;
      if (!id) {
        id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        h.id = id;
      }
      return { level, text, id };
    });
  }

  /**
   * Replace the final breadcrumb (a filename) with the document's own `<h1>`. A reader recognises
   * "01 — .NET Platform, CLR & Compilation" far quicker than "01-dotnet-platform-and-clr.md".
   */
  private useHeadingAsBreadcrumbLabel(): void {
    const heading = this.contentDiv?.nativeElement.querySelector('h1');
    const title = heading?.textContent?.trim();
    if (!title || !this.breadcrumbs.length) return;

    const last = this.breadcrumbs[this.breadcrumbs.length - 1];
    this.breadcrumbs = [...this.breadcrumbs.slice(0, -1), { ...last, label: title, exact: true }];
  }

  /**
   * Make links inside the rendered markdown behave.
   *
   * - **In-page anchors** (`[text](#some-heading)`): a bare `#…` href would overwrite the whole
   *   location hash, and under hash routing that *is* the route — so the reader gets bounced to the
   *   home page. Scroll manually instead and leave the route alone.
   * - **External links** open in a new tab, with `rel="noopener noreferrer"` so the opened page
   *   cannot reach back into this one.
   *
   * Document links (`…/other.md`) are already rewritten to `#/file?path=…` before render.
   */
  private processLinks(): void {
    const el = this.contentDiv?.nativeElement;
    if (!el) return;

    el.querySelectorAll('a[href]').forEach((node: Element) => {
      const anchor = node as HTMLAnchorElement;
      if (anchor.dataset['linkReady']) return;
      anchor.dataset['linkReady'] = 'true';

      const href = anchor.getAttribute('href') ?? '';

      // Router links produced by rewriteDocumentLinks — leave them to the router.
      if (href.startsWith('#/')) return;

      if (href.startsWith('#')) {
        anchor.classList.add('anchor-link');
        anchor.addEventListener('click', event => {
          event.preventDefault();
          this.scrollToAnchor(decodeURIComponent(href.slice(1)));
        });
        return;
      }

      if (/^https?:\/\//i.test(href)) {
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.classList.add('external-link');
      }
    });
  }

  /** Scroll to a heading by id, falling back to a case-insensitive slug match on its text. */
  private scrollToAnchor(id: string): void {
    const root = this.contentDiv?.nativeElement;
    if (!root) return;

    // Compare ids in JS rather than via a selector: heading ids are slugs that routinely start
    // with a digit ("1-introduction"), which is not a valid CSS identifier.
    let target: HTMLElement | null =
      Array.from(root.querySelectorAll<HTMLElement>('[id]')).find(node => node.id === id) ?? null;

    if (!target) {
      // GitHub and buildToc() can slugify a heading slightly differently (punctuation, casing),
      // so match on the normalised text as a second attempt.
      const wanted = id.toLowerCase();
      const match = Array.from(root.querySelectorAll<HTMLElement>('h1,h2,h3,h4'))
        .find(h => h.id.toLowerCase() === wanted || this.slugify(h.innerText) === wanted);
      target = match ?? null;
    }

    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private slugify(text: string): string {
    return text.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
  }

  private processCodeBlocks(): void {
    const el = this.contentDiv?.nativeElement;
    if (!el) return;
    el.querySelectorAll('pre').forEach((pre: HTMLElement) => {
      if (pre.parentElement?.classList.contains('code-block-wrapper')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';
      const actions = document.createElement('div');
      actions.className = 'code-actions';
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.setAttribute('aria-label', 'Copy code');
      this.setCopyBtnState(copyBtn, 'idle');
      copyBtn.addEventListener('click', () => {
        if (!window.isSecureContext || !navigator.clipboard) {
          this.setCopyBtnState(copyBtn, 'error');
          setTimeout(() => this.setCopyBtnState(copyBtn, 'idle'), 2000);
          return;
        }
        navigator.clipboard.writeText(pre.innerText).then(() => {
          this.setCopyBtnState(copyBtn, 'success');
          setTimeout(() => this.setCopyBtnState(copyBtn, 'idle'), 2000);
        }).catch(() => {
          this.setCopyBtnState(copyBtn, 'error');
          setTimeout(() => this.setCopyBtnState(copyBtn, 'idle'), 2000);
        });
      });
      actions.appendChild(copyBtn);
      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(actions);
      wrapper.appendChild(pre);
    });
  }

  private setCopyBtnState(btn: HTMLButtonElement, state: 'idle' | 'success' | 'error'): void {
    const icon = document.createElement('i');
    icon.className =
      state === 'idle' ? 'fas fa-copy' :
      state === 'success' ? 'fas fa-check' : 'fas fa-times';
    const text = document.createTextNode(
      state === 'idle' ? ' Copy' : state === 'success' ? ' Copied!' : ' Failed'
    );
    btn.replaceChildren(icon, text);
  }

  private buildBreadcrumbs(path: string): void {
    const parts = path.split('/').filter(Boolean);
    this.breadcrumbs = parts.map((p, i) => ({
      label: p,
      // Ancestors link to their folder view; the last crumb is this document itself.
      path: parts.slice(0, i + 1).join('/'),
      isFile: i === parts.length - 1
    }));
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.scrollHandler);
    this.destroy$.next();
    this.destroy$.complete();
  }
}
