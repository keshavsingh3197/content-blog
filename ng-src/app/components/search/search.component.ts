import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ContentService } from '../../services/content.service';
import { I18nService } from '../../services/i18n.service';
import { CONFIG_KEYS, RuntimeConfigService } from '../../services/runtime-config.service';
import { FileNode } from '../../models/file-node.model';

@Component({
  selector: 'app-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="search-container">
      <div class="search-input-wrapper">
        <i class="fas fa-search search-icon"></i>
        <input
          type="text"
          class="search-input"
          [placeholder]="i18n.t('blog.search.placeholder')"
          [(ngModel)]="query"
          (ngModelChange)="onQueryChange($event)"
          (keydown.escape)="clearSearch()"
          [attr.aria-label]="i18n.t('blog.search.placeholder')"
        >
        <button *ngIf="query" class="search-clear" (click)="clearSearch()"
                [attr.aria-label]="i18n.t('common.actions.close')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="search-results" *ngIf="results.length > 0 || (query && searched)">
        <div *ngIf="results.length === 0" class="search-no-results">
          <i class="fas fa-search me-2"></i>{{ i18n.t('blog.search.noResults') }}
        </div>
        <div
          class="search-result-item"
          *ngFor="let item of results"
          (click)="openFile(item)"
          role="button"
          tabindex="0"
          (keydown.enter)="openFile(item)"
        >
          <i class="fas fa-file-alt me-2 text-primary"></i>
          <div>
            <div class="fw-medium">{{ item.name }}</div>
            <small class="text-muted">{{ item.path }}</small>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SearchComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly config = inject(RuntimeConfigService);

  query = '';
  results: FileNode[] = [];
  searched = false;
  private nodes: FileNode[] = [];
  private querySubject = new Subject<string>();

  constructor(
    private contentService: ContentService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.contentService.getStructure().subscribe(nodes => {
      this.nodes = nodes;
    });
    // The debounce is a config value (`ui.search.mindebounce`) so it can be tuned without a rebuild.
    const debounceMs = this.config.num(CONFIG_KEYS.uiSearchDebounce, 300);
    this.querySubject.pipe(debounceTime(debounceMs), distinctUntilChanged()).subscribe(q => {
      this.results = q ? this.contentService.searchFiles(q, this.nodes) : [];
      this.searched = !!q;
      this.cdr.markForCheck();
    });
  }

  onQueryChange(q: string): void {
    this.querySubject.next(q);
  }

  clearSearch(): void {
    this.query = '';
    this.results = [];
    this.searched = false;
    this.cdr.markForCheck();
  }

  openFile(node: FileNode): void {
    this.router.navigate(['/file'], { queryParams: { path: node.path } });
    this.clearSearch();
  }
}
