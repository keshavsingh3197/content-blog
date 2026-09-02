import {
  Component, OnInit, OnDestroy, ElementRef, ViewChild,
  ChangeDetectionStrategy, ChangeDetectorRef, effect, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { EMPTY, Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { MarkdownModule, MermaidAPI } from 'ngx-markdown';
import { ContentService } from '../../services/content.service';
import { PageStatsService } from '../../services/page-stats.service';
import { MermaidLoaderService } from '../../services/mermaid-loader.service';
import { ThemeService } from '../../services/theme.service';
import { I18nService } from '../../services/i18n.service';
import { FileNode } from '../../models/file-node.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../breadcrumb/breadcrumb.component';
import { CommentsComponent } from '../comments/comments.component';
import { parseDocName } from '../../utils/doc-name';
import { normalizeContentPath } from '../../services/content-path';

export interface TocItem {
  level: number;
  text: string;
  id: string;
}

/** A tag as rendered: the author's spelling plus the slug the `/tags` route matches on. */
interface TagChip {
  label: string;
  slug: string;
}

@Component({
  selector: 'app-content-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, BreadcrumbComponent, MarkdownModule, CommentsComponent],
  template: `
    <div class="container container-reader mt-4">
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
        <!--
          Section rail. Only rendered on very wide viewports, where the article has already grown
          to a comfortable measure and the remaining space would otherwise sit empty.
        -->
        <aside class="section-rail" *ngIf="siblings.length > 1">
          <div class="rail-panel">
            <div class="rail-title">
              <i class="fas fa-folder-open me-2"></i>{{ folderName }}
            </div>
            <nav class="rail-nav">
              <a
                *ngFor="let doc of siblings"
                class="rail-link"
                [class.rail-active]="doc.path === currentPath"
                [routerLink]="['/file']"
                [queryParams]="{ path: doc.path }"
              >{{ docLabel(doc) }}</a>
            </nav>
          </div>
        </aside>

        <!-- Mobile TOC (collapsible, shown only on small screens) -->
        <div class="mobile-toc" *ngIf="toc.length > 1">
          <button class="mobile-toc-toggle" (click)="tocOpen = !tocOpen" [attr.aria-expanded]="tocOpen">
            <i class="fas fa-list me-2"></i>{{ i18n.t('blog.content.contents') }}
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
            <div class="toc-title"><i class="fas fa-list me-2"></i>{{ i18n.t('blog.content.contents') }}</div>
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
              <span class="meta-item">
                <i class="fas fa-clock"></i>&nbsp;{{ i18n.t('blog.content.readingTime', { minutes: readingTime }) }}
              </span>
              <span class="meta-item">
                <i class="fas fa-align-left"></i>&nbsp;{{ i18n.t('blog.content.words', { count: wordCount }) }}
              </span>
              <span class="meta-item" *ngIf="updated">
                <i class="fas fa-calendar-day"></i>&nbsp;{{ i18n.t('blog.content.updated', { date: updated }) }}
              </span>
              <!-- Absent until the API answers: a missing counter is better than a wrong "0 views". -->
              <span class="meta-item" *ngIf="views !== null">
                <i class="fas fa-eye"></i>&nbsp;{{ i18n.t('blog.content.views', { count: views }) }}
              </span>
              <!--
                Pushed to the end of the bar so the action never sits between two read-only facts.
                Hidden from print itself: a button is noise on paper.
              -->
              <button class="meta-action no-print" type="button" (click)="print()"
                      [title]="i18n.t('blog.content.print')">
                <i class="fas fa-print"></i>&nbsp;{{ i18n.t('blog.content.print') }}
              </button>
            </div>

            <!-- Tags. Authored in the document's front matter; folder-derived when it has none. -->
            <div class="content-tags" *ngIf="tags.length">
              <i class="fas fa-tags content-tags-icon" [title]="i18n.t('blog.tags.title')"></i>
              <a
                *ngFor="let tag of tags"
                class="tag-chip"
                [routerLink]="['/tags']"
                [queryParams]="{ tag: tag.slug }"
              >{{ tag.label }}</a>
            </div>

            <!--
              Print-only masthead. On paper there is no navbar, no breadcrumb and no address bar,
              so the sheet has to say for itself what it is and where it came from.
            -->
            <div class="print-only print-masthead">
              <div class="print-title" *ngIf="!hasOwnHeading">{{ docTitle || fileName }}</div>
              <div class="print-source">{{ sourceUrl }}</div>
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

          <app-comments [path]="currentPath"></app-comments>
        </div>
      </div>

      <!-- Back to top -->
      <button
        class="back-to-top no-print"
        [class.visible]="showBackToTop"
        (click)="scrollToTop()"
        [attr.aria-label]="i18n.t('blog.content.backToTop')"
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
  docTitle = '';
  updated = '';
  /** True once the rendered markdown is found to carry its own `<h1>`; the print masthead
      then prints only the source URL instead of repeating the title straight above it. */
  hasOwnHeading = false;
  wordCount = 0;
  readingTime = 0;
  /** Read count for this document, or null while unknown / when the API is unreachable. */
  views: number | null = null;
  tags: TagChip[] = [];
  breadcrumbs: BreadcrumbItem[] = [];
  toc: TocItem[] = [];
  activeTocId = '';
  showBackToTop = false;
  tocOpen = false;
  currentPath = '';

  /** Documents in the same folder, for the wide-viewport section rail. */
  siblings: FileNode[] = [];
  folderName = '';

  /** The navigation tree, once it arrives; the source for the rail and the metadata fallback. */
  private structure: FileNode[] = [];

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

  private readonly pageStats = inject(PageStatsService);
  private readonly mermaidLoader = inject(MermaidLoaderService);
  private readonly themeService = inject(ThemeService);
  readonly i18n = inject(I18nService);

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

  /** The document's own URL, printed on paper where the address bar is not there to show it. */
  get sourceUrl(): string {
    return `${location.origin}${location.pathname}#/file?path=${encodeURIComponent(this.currentPath)}`;
  }

  ngOnInit(): void {
    window.addEventListener('scroll', this.scrollHandler, { passive: true });

    // The navigation tree also carries each document's tags and title, so it doubles as the
    // fallback for a file whose front matter was never written, and as the source for the rail.
    this.contentService.getStructure()
      .pipe(takeUntil(this.destroy$))
      .subscribe(nodes => {
        this.structure = nodes;
        this.applyStructureMetadata();
        this.cdr.markForCheck();
      });

    this.route.queryParams.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        // `path` comes from the query string, so it is a trust boundary: without this check a
        // crafted link (`?path=https://evil.example/pwn.md`) would have the blog fetch and render
        // someone else's markdown inside its own chrome. Same predicate as the API's ContentPath.
        const path = normalizeContentPath(params['path']);
        if (!path) {
          this.resetDocumentState();
          this.error = this.i18n.t('blog.content.loadFailed');
          this.loading = false;
          this.cdr.markForCheck();
          return EMPTY;
        }
        this.loading = true;
        this.resetDocumentState();
        this.trackView(path);
        this.currentPath = path;
        this.buildBreadcrumbs(path);
        this.fileName = path.split('/').pop() || path;
        this.applyStructureMetadata();
        window.scrollTo({ top: 0, behavior: 'instant' });
        this.cdr.markForCheck();
        return this.contentService.getFile(path);
      })
    ).subscribe({
      next: (text) => {
        // The front matter is metadata, not prose: read it, then take it off the top so the
        // reader never sees the raw `---` fence.
        const front = this.contentService.parseFrontMatter(text);
        const body = this.contentService.stripFrontMatter(text);

        if (front.title) this.docTitle = front.title;
        if (front.updated) this.updated = front.updated;
        if (front.tags.length) this.tags = front.tags.map(tag => this.toChip(tag));

        // Images first, then document links — relative hrefs would otherwise resolve against the
        // site root (hash routing) and fall through 404.html back to the home page.
        const withImages = this.contentService.rewriteImagePaths(body, this.currentPath);
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
        this.error = this.i18n.t('blog.content.loadFailed');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }


  /** Clear everything that belongs to the previously rendered document. */
  private resetDocumentState(): void {
    this.error = '';
    this.content = '';
    this.toc = [];
    this.tags = [];
    this.docTitle = '';
    this.updated = '';
    this.hasOwnHeading = false;
    this.views = null;
    this.tocOpen = false;
    this.currentPath = '';
    this.fileName = '';
    this.breadcrumbs = [];
  }
  /**
   * Count this read and show the running total. The server decides whether it counts — a refresh by
   * the same reader inside the de-duplication window does not — so this fires on every navigation.
   */
  private trackView(path: string): void {
    if (!path) return;
    this.pageStats.track(path).subscribe(stat => {
      if (!stat || stat.path !== this.currentPath) return;
      this.views = stat.views;
      this.cdr.markForCheck();
    });
  }

  /** Hand the sheet to the browser. Everything print-specific is done in CSS, not by cloning DOM. */
  print(): void {
    window.print();
  }

  /** The rail shows titles, falling back to the filename-derived label for untitled documents. */
  docLabel(node: FileNode): string {
    return node.title || parseDocName(node.name).title;
  }

  /**
   * Fill in whatever the downloaded file has not supplied: sibling documents for the rail, plus
   * tags and a title for a document with no front matter. Runs on both the route change and the
   * structure arriving, because either can land first.
   */
  private applyStructureMetadata(): void {
    if (!this.structure.length || !this.currentPath) return;

    const slash = this.currentPath.lastIndexOf('/');
    const folderPath = slash > 0 ? this.currentPath.slice(0, slash) : '';
    const folder = folderPath
      ? this.contentService.findNodeByPath(folderPath, this.structure)
      : null;

    this.folderName = folder?.name ?? folderPath.split('/').pop() ?? '';
    this.siblings = (folder?.children ?? []).filter(child => !child.isDirectory);

    const node = this.contentService.findNodeByPath(this.currentPath, this.structure);
    if (!node) return;
    if (!this.docTitle && node.title) this.docTitle = node.title;
    if (!this.updated && node.updated) this.updated = node.updated;
    if (!this.tags.length && node.tags?.length) {
      this.tags = node.tags.map(tag => this.toChip(tag));
    }
  }

  private toChip(label: string): TagChip {
    return { label, slug: ContentService.tagSlug(label) };
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
    this.hasOwnHeading = !!title;
    if (!title || !this.breadcrumbs.length) return;

    if (!this.docTitle) this.docTitle = title;

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
      actions.className = 'code-actions no-print';
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.setAttribute('aria-label', this.i18n.t('blog.content.copyCode'));
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
      state === 'idle' ? ` ${this.i18n.t('blog.content.copy')}` :
      state === 'success' ? ` ${this.i18n.t('blog.content.copied')}` :
      ` ${this.i18n.t('blog.content.copyFailed')}`
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
