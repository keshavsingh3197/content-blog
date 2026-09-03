import {
  Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { combineLatest } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ContentService } from '../../core/services/content.service';
import { I18nService } from '../../core/services/i18n.service';
import { FileNode, TagSummary } from '../../core/models/file-node.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';
import { parseDocName } from '../../core/utils/doc-name';

/**
 * The tag index: every tag in the library, and the documents behind one of them.
 *
 * Tags come from each document's front matter (or, for a document that has none, from the folders
 * it lives in) and are baked into `structure.json` by `generate_structure.py`. Nothing here calls
 * an API — the tag browser works on the static site exactly as it does locally.
 */
@Component({
  selector: 'app-tags-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, BreadcrumbComponent],
  template: `
    <div class="container mt-4">
      <app-breadcrumb [items]="breadcrumbs"></app-breadcrumb>

      <h1 class="section-heading mb-2">
        <i class="fas fa-tags me-2"></i>{{ i18n.t('blog.tags.title') }}
      </h1>
      <p class="tags-subtitle">{{ i18n.t('blog.tags.subtitle') }}</p>

      <!-- The cloud stays on screen while a tag is selected, so switching tags is one click. -->
      <div class="tag-cloud" *ngIf="allTags.length">
        <a
          class="tag-chip tag-chip-lg"
          [class.tag-chip-active]="!activeSlug"
          [routerLink]="['/tags']"
        >{{ i18n.t('blog.tags.all') }}<span class="tag-count">{{ totalDocuments }}</span></a>
        <a
          *ngFor="let tag of allTags"
          class="tag-chip tag-chip-lg"
          [class.tag-chip-active]="tag.slug === activeSlug"
          [routerLink]="['/tags']"
          [queryParams]="{ tag: tag.slug }"
        >{{ tag.label }}<span class="tag-count">{{ tag.count }}</span></a>
      </div>

      <div class="alert alert-info" *ngIf="!allTags.length">
        <i class="fas fa-info-circle me-2"></i>{{ i18n.t('common.state.loading') }}
      </div>

      <!-- Documents behind the selected tag -->
      <ng-container *ngIf="activeSlug">
        <h2 class="section-heading mt-4 mb-3">
          <i class="fas fa-file-lines me-2 text-primary"></i>{{ activeLabel }}
          <span class="section-count">{{ matches.length }}</span>
        </h2>

        <div class="alert alert-warning" *ngIf="!matches.length">
          <i class="fas fa-exclamation-triangle me-2"></i>{{ i18n.t('blog.tags.noMatches') }}
        </div>

        <div class="doc-list" *ngIf="matches.length">
          <a
            class="doc-card"
            *ngFor="let file of matches; let i = index"
            [routerLink]="['/file']"
            [queryParams]="{ path: file.path }"
          >
            <span class="doc-index" [class.doc-index-plain]="!docNumber(file)">
              {{ docNumber(file) || (i + 1) }}
            </span>
            <span class="doc-body">
              <span class="doc-title">{{ docTitle(file) }}</span>
              <span class="doc-file">{{ file.path }}</span>
              <span class="doc-summary" *ngIf="file.summary">{{ file.summary }}</span>
            </span>
            <i class="fas fa-arrow-right doc-go"></i>
          </a>
        </div>
      </ng-container>
    </div>
  `
})
export class TagsViewComponent implements OnInit {
  readonly i18n = inject(I18nService);

  allTags: TagSummary[] = [];
  matches: FileNode[] = [];
  activeSlug = '';
  activeLabel = '';
  totalDocuments = 0;
  breadcrumbs: BreadcrumbItem[] = [];

  private readonly route = inject(ActivatedRoute);
  private readonly contentService = inject(ContentService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // Both inputs are needed together: the tag in the URL means nothing until the tree is loaded,
    // and the tree tells us nothing to show until a tag is picked.
    combineLatest([this.contentService.getStructure(), this.route.queryParams])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([nodes, params]) => {
        this.allTags = this.contentService.buildTagIndex(nodes);
        this.totalDocuments = this.contentService.countFiles(nodes);

        this.activeSlug = ContentService.tagSlug(params['tag'] ?? '');
        if (!params['tag']) this.activeSlug = '';

        this.activeLabel =
          this.allTags.find(t => t.slug === this.activeSlug)?.label ?? this.activeSlug;
        this.matches = this.activeSlug
          ? this.contentService.filesWithTag(this.activeSlug, nodes)
          : [];

        this.breadcrumbs = this.activeSlug
          ? [{ label: this.i18n.t('blog.tags.title'), path: 'tags', route: '/tags', query: {} },
             { label: this.activeLabel, path: 'tags', isFile: true, exact: true }]
          : [];

        this.cdr.markForCheck();
      });
  }

  docTitle(file: FileNode): string {
    return file.title || parseDocName(file.name).title;
  }

  docNumber(file: FileNode): string {
    return parseDocName(file.name).order;
  }
}
