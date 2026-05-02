import {
  Component, OnInit, OnDestroy, AfterViewChecked, ElementRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { MarkdownModule } from 'ngx-markdown';
import { ContentService } from '../../services/content.service';
import { BreadcrumbComponent, BreadcrumbItem } from '../breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-content-view',
  standalone: true,
  imports: [CommonModule, RouterModule, BreadcrumbComponent, MarkdownModule],
  template: `
    <div class="container mt-4">
      <app-breadcrumb [items]="breadcrumbs"></app-breadcrumb>
      <div class="row">
        <div class="col-12">
          <div class="content-view-panel" *ngIf="!loading && !error">
            <div class="content-meta">
              <span class="meta-item"><i class="fas fa-file-alt"></i>&nbsp;{{ fileName }}</span>
              <span class="meta-item"><i class="fas fa-clock"></i>&nbsp;{{ readingTime }} min read</span>
              <span class="meta-item"><i class="fas fa-align-left"></i>&nbsp;{{ wordCount }} words</span>
            </div>
            <div class="markdown-body" #contentDiv>
              <markdown [data]="content" (ready)="onMarkdownReady()"></markdown>
            </div>
          </div>
          <div class="loading-spinner" *ngIf="loading">
            <div class="spinner-border text-primary" role="status"></div>
            <span>Loading content...</span>
          </div>
          <div class="alert alert-danger" *ngIf="error">
            <i class="fas fa-exclamation-circle me-2"></i>{{ error }}
          </div>
        </div>
      </div>
    </div>
  `
})
export class ContentViewComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('contentDiv') contentDiv?: ElementRef<HTMLElement>;

  content = '';
  loading = true;
  error = '';
  fileName = '';
  wordCount = 0;
  readingTime = 0;
  breadcrumbs: BreadcrumbItem[] = [];

  private destroy$ = new Subject<void>();
  private codeBlocksProcessed = false;

  constructor(private route: ActivatedRoute, private contentService: ContentService) {}

  ngOnInit(): void {
    this.route.queryParams.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        const path = params['path'] || '';
        this.loading = true;
        this.error = '';
        this.content = '';
        this.codeBlocksProcessed = false;
        this.buildBreadcrumbs(path);
        this.fileName = path.split('/').pop() || path;
        return this.contentService.getFile(path);
      })
    ).subscribe({
      next: (text) => {
        this.content = text;
        this.wordCount = text.split(/\s+/).filter(Boolean).length;
        this.readingTime = Math.ceil(this.wordCount / 200);
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load file. Please try again.';
        this.loading = false;
      }
    });
  }

  onMarkdownReady(): void {
    this.codeBlocksProcessed = false;
  }

  ngAfterViewChecked(): void {
    if (!this.codeBlocksProcessed && this.contentDiv?.nativeElement) {
      const pres = this.contentDiv.nativeElement.querySelectorAll('pre');
      if (pres.length > 0) {
        this.codeBlocksProcessed = true;
        pres.forEach((pre: HTMLElement) => {
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
    }
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
    this.destroy$.next();
    this.destroy$.complete();
  }
}
