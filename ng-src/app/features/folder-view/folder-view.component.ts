import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, switchMap, map } from 'rxjs/operators';
import { ContentService } from '../../core/services/content.service';
import { I18nService } from '../../core/services/i18n.service';
import { LibraryService } from '../../core/services/library.service';
import { FileNode } from '../../core/models/file-node.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { parseDocName } from '../../core/utils/doc-name';
import { normalizeFolderPath } from '../../core/content-path';

const FOLDER_COLORS: string[] = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#0072c6,#00b4f0)',
  'linear-gradient(135deg,#ff9900,#ff6600)',
  'linear-gradient(135deg,#0db7ed,#066da5)',
  'linear-gradient(135deg,#11998e,#38ef7d)',
  'linear-gradient(135deg,#f953c6,#b91d73)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#f7971e,#ffd200)',
];

/**
 * A folder's contents: its sections, then its documents.
 *
 * Everything user-facing here used to be hardcoded English — "Documents", "This folder is empty.",
 * "files" — which meant switching language left this one page untranslated. It reads from the
 * catalogue like the rest of the site now.
 *
 * The filter is client-side and deliberately so: the whole tree is already in memory from
 * `structure.json`, so filtering costs nothing and works with no API.
 */
@Component({
  selector: 'app-folder-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, FormsModule, BreadcrumbComponent, RevealDirective],
  template: `
    <div class="container mt-4">
      <app-breadcrumb [items]="breadcrumbs"></app-breadcrumb>

      <div *ngIf="!folderNode" class="alert alert-warning">
        <i class="fas fa-exclamation-triangle me-2" aria-hidden="true"></i>{{ i18n.t('blog.folder.notFound') }}
      </div>

      <ng-container *ngIf="folderNode">
        <header class="folder-head">
          <div class="folder-head-main">
            <h1 class="folder-title">
              <i class="fas fa-folder-open" aria-hidden="true"></i>{{ folderNode.name }}
            </h1>
            <p class="folder-meta">{{ i18n.t('blog.folder.fileCount', { count: totalFiles }) }}</p>
          </div>

          <!-- Up one level. The breadcrumb offers the same jump, but on a phone it collapses to
               icons, so the explicit control is what actually gets used there. -->
          <a
            class="folder-up"
            *ngIf="parentPath !== null"
            [routerLink]="['/folder']"
            [queryParams]="parentPath ? { path: parentPath } : {}"
          >
            <i class="fas fa-turn-up" aria-hidden="true"></i>{{ i18n.t('blog.folder.parent') }}
          </a>
        </header>

        <!-- Sub-folders -->
        <section *ngIf="subFolders.length > 0" class="mb-4">
          <h2 class="section-heading mb-3">
            <i class="fas fa-diagram-project" aria-hidden="true"></i>{{ i18n.t('blog.folder.subFolders') }}
            <span class="section-count">{{ subFolders.length }}</span>
          </h2>
          <div class="topic-grid">
            <button
              class="topic-card"
              *ngFor="let folder of subFolders; let i = index"
              [appReveal]="i * 45"
              (click)="openFolder(folder)"
              [attr.aria-label]="i18n.t('blog.nav.browseFolder', { name: folder.name })"
            >
              <span class="topic-icon-chip" [style.background]="folderColor(i)">
                <i class="fas fa-folder topic-icon" aria-hidden="true"></i>
              </span>
              <span class="topic-title">{{ folder.name }}</span>
              <span class="topic-count">{{ i18n.t('blog.folder.fileCount', { count: childFileCount(folder) }) }}</span>
              <span class="topic-arrow"><i class="fas fa-arrow-right" aria-hidden="true"></i></span>
            </button>
          </div>
        </section>

        <!-- Documents in this folder -->
        <section *ngIf="files.length > 0">
          <div class="list-head">
            <h2 class="section-heading">
              <i class="fas fa-file-lines" aria-hidden="true"></i>{{ i18n.t('blog.folder.documents') }}
              <span class="section-count">{{ visibleFiles.length }}</span>
            </h2>

            <!-- Only worth the space once the list is long enough to need it. -->
            <label class="inline-filter" *ngIf="files.length > 6">
              <i class="fas fa-filter" aria-hidden="true"></i>
              <span class="visually-hidden">{{ i18n.t('blog.folder.filter') }}</span>
              <input
                type="text"
                [placeholder]="i18n.t('blog.folder.filter')"
                [(ngModel)]="filter"
                (ngModelChange)="applyFilter()"
                (keydown.escape)="clearFilter()"
              >
              <button type="button" *ngIf="filter" (click)="clearFilter()"
                      [attr.aria-label]="i18n.t('common.actions.clear')">
                <i class="fas fa-times" aria-hidden="true"></i>
              </button>
            </label>
          </div>

          <div class="alert alert-info" *ngIf="!visibleFiles.length">
            <i class="fas fa-info-circle me-2" aria-hidden="true"></i>{{ i18n.t('blog.folder.noMatches') }}
          </div>

          <div class="doc-list">
            <button
              class="doc-card"
              *ngFor="let file of visibleFiles; let i = index"
              (click)="openFile(file)"
              [attr.aria-label]="i18n.t('blog.folder.read', { name: docTitle(file) })"
            >
              <!-- A leading number in the filename is the chapter order — surface it as a badge
                   so a numbered series reads as a sequence rather than a list of filenames. -->
              <span class="doc-index" [class.doc-index-plain]="!docNumber(file)">
                {{ docNumber(file) || (i + 1) }}
              </span>
              <span class="doc-body">
                <span class="doc-title">{{ docTitle(file) }}</span>
                <span class="doc-summary" *ngIf="file.summary">{{ file.summary }}</span>
                <span class="doc-file">{{ file.name }}</span>
              </span>
              <i class="fas fa-bookmark doc-saved" *ngIf="library.isBookmarked(file.path)"
                 [title]="i18n.t('blog.bookmarks.saved')" aria-hidden="true"></i>
              <i class="fas fa-arrow-right doc-go" aria-hidden="true"></i>
            </button>
          </div>
        </section>

        <div *ngIf="subFolders.length === 0 && files.length === 0" class="alert alert-info">
          <i class="fas fa-info-circle me-2" aria-hidden="true"></i>{{ i18n.t('blog.folder.empty') }}
        </div>
      </ng-container>
    </div>
  `
})
export class FolderViewComponent implements OnInit, OnDestroy {
  protected readonly i18n = inject(I18nService);
  protected readonly library = inject(LibraryService);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly contentService = inject(ContentService);
  private readonly cdr = inject(ChangeDetectorRef);

  folderNode: FileNode | null = null;
  subFolders: FileNode[] = [];
  files: FileNode[] = [];
  /** `files` after the filter box; the same array when the box is empty. */
  visibleFiles: FileNode[] = [];
  breadcrumbs: BreadcrumbItem[] = [];
  filter = '';
  totalFiles = 0;

  /** Path of the containing folder, `''` for the root listing, or null when there is no parent. */
  parentPath: string | null = null;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.route.queryParams.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        // Same trust boundary as the document route: only paths shaped like a node of the content
        // tree get as far as the lookup, so nothing arbitrary reaches the breadcrumbs.
        const path = normalizeFolderPath(params['path']) ?? '';
        this.buildBreadcrumbs(path);
        return this.contentService.getStructure().pipe(
          map(nodes => ({ path, nodes }))
        );
      })
    ).subscribe(({ path, nodes }) => {
      this.folderNode = path ? this.contentService.findNodeByPath(path, nodes) : null;
      if (!this.folderNode && !path) {
        // Show root
        this.folderNode = { name: 'src', path: 'src', isDirectory: true, children: nodes };
      }

      const slash = path.lastIndexOf('/');
      this.parentPath = !path || path === 'src' ? null : slash > 0 ? path.slice(0, slash) : '';

      this.subFolders = this.folderNode?.children?.filter(n => n.isDirectory) ?? [];
      this.files = this.folderNode?.children?.filter(n => !n.isDirectory) ?? [];
      this.totalFiles = this.folderNode ? this.contentService.countFiles([this.folderNode]) : 0;
      this.filter = '';
      this.applyFilter();
      this.cdr.markForCheck();
    });
  }

  applyFilter(): void {
    const needle = this.filter.trim().toLowerCase();
    this.visibleFiles = needle
      ? this.files.filter(file =>
          this.docTitle(file).toLowerCase().includes(needle) ||
          file.name.toLowerCase().includes(needle) ||
          (file.summary ?? '').toLowerCase().includes(needle))
      : this.files;
    this.cdr.markForCheck();
  }

  clearFilter(): void {
    this.filter = '';
    this.applyFilter();
  }

  folderColor(index: number): string {
    return FOLDER_COLORS[index % FOLDER_COLORS.length];
  }

  childFileCount(node: FileNode): number {
    return this.contentService.countFiles([node]);
  }

  /** Leading order number from a filename like "03-oop-and-class-design.md", if present. */
  docNumber(node: FileNode): string {
    return parseDocName(node.name).order;
  }

  /**
   * The document's own title when its front matter (or first heading) gave one, otherwise a title
   * derived from the filename: "09-aspnet-core-pipeline-and-di.md" -> "Aspnet Core Pipeline and DI".
   */
  docTitle(node: FileNode): string {
    return node.title || parseDocName(node.name).title;
  }

  openFolder(node: FileNode): void {
    void this.router.navigate(['/folder'], { queryParams: { path: node.path } });
  }

  openFile(node: FileNode): void {
    void this.router.navigate(['/file'], { queryParams: { path: node.path } });
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
