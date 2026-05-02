import {
  Component, OnInit, OnDestroy, ElementRef, ViewChild,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { MarkdownModule } from 'ngx-markdown';
import { ContentService } from '../../services/content.service';
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
              <markdown [data]="content" (ready)="onMarkdownReady()"></markdown>
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
        this.buildBreadcrumbs(path);
        this.fileName = path.split('/').pop() || path;
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        this.cdr.markForCheck();
        return this.contentService.getFile(path);
      })
    ).subscribe({
      next: (text) => {
        this.content = text;
        this.wordCount = text.split(/\s+/).filter(Boolean).length;
        this.readingTime = Math.ceil(this.wordCount / 200);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Failed to load file. Please try again.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onMarkdownReady(): void {
    // Use a single rAF to avoid running in the CD cycle
    requestAnimationFrame(() => {
      this.processCodeBlocks();
      this.buildToc();
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
      path: parts.slice(0, i + 1).join('/')
    }));
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.scrollHandler);
    this.destroy$.next();
    this.destroy$.complete();
  }
}
