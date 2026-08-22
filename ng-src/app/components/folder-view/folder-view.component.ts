import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, switchMap, map } from 'rxjs/operators';
import { ContentService } from '../../services/content.service';
import { FileNode } from '../../models/file-node.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../breadcrumb/breadcrumb.component';
import { parseDocName } from '../../utils/doc-name';

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

@Component({
  selector: 'app-folder-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, BreadcrumbComponent],
  template: `
    <div class="container mt-4">
      <app-breadcrumb [items]="breadcrumbs"></app-breadcrumb>

      <div *ngIf="!folderNode" class="alert alert-warning">
        <i class="fas fa-exclamation-triangle me-2"></i>Folder not found.
      </div>

      <ng-container *ngIf="folderNode">
        <!-- Sub-folders -->
        <div *ngIf="subFolders.length > 0" class="mb-4">
          <h2 class="section-heading mb-3">
            <i class="fas fa-folder-open me-2"></i>{{ folderNode.name }}
          </h2>
          <div class="row">
            <div class="col-6 col-md-4 col-lg-3 mb-3" *ngFor="let folder of subFolders; let i = index">
              <button
                class="topic-card w-100"
                (click)="openFolder(folder)"
                [attr.aria-label]="'Browse ' + folder.name"
              >
                <span class="topic-icon-chip" [style.background]="folderColor(i)">
                  <i class="fas fa-folder topic-icon"></i>
                </span>
                <div class="topic-title">{{ folder.name }}</div>
                <div class="topic-count">{{ childFileCount(folder) }} files</div>
              </button>
            </div>
          </div>
        </div>

        <!-- Documents in this folder -->
        <div *ngIf="files.length > 0">
          <h2 class="section-heading mb-3">
            <i class="fas fa-file-lines me-2 text-primary"></i>Documents
            <span class="section-count">{{ files.length }}</span>
          </h2>
          <div class="doc-list">
            <button
              class="doc-card"
              *ngFor="let file of files; let i = index"
              (click)="openFile(file)"
              [attr.aria-label]="'Read ' + docTitle(file)"
            >
              <!-- A leading number in the filename is the chapter order — surface it as a badge
                   so a numbered series reads as a sequence rather than a list of filenames. -->
              <span class="doc-index" [class.doc-index-plain]="!docNumber(file)">
                {{ docNumber(file) || (i + 1) }}
              </span>
              <span class="doc-body">
                <span class="doc-title">{{ docTitle(file) }}</span>
                <span class="doc-file">{{ file.name }}</span>
              </span>
              <i class="fas fa-arrow-right doc-go"></i>
            </button>
          </div>
        </div>

        <div *ngIf="subFolders.length === 0 && files.length === 0" class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>This folder is empty.
        </div>
      </ng-container>
    </div>
  `
})
export class FolderViewComponent implements OnInit, OnDestroy {
  folderNode: FileNode | null = null;
  subFolders: FileNode[] = [];
  files: FileNode[] = [];
  breadcrumbs: BreadcrumbItem[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contentService: ContentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.queryParams.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        const path = params['path'] || '';
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
      this.subFolders = this.folderNode?.children?.filter(n => n.isDirectory) ?? [];
      this.files = this.folderNode?.children?.filter(n => !n.isDirectory) ?? [];
      this.cdr.markForCheck();
    });
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

  /** Readable title from a filename, e.g. "09-aspnet-core-pipeline-and-di.md" -> "Aspnet Core Pipeline and DI". */
  docTitle(node: FileNode): string {
    return parseDocName(node.name).title;
  }

  openFolder(node: FileNode): void {
    this.router.navigate(['/folder'], { queryParams: { path: node.path } });
  }

  openFile(node: FileNode): void {
    this.router.navigate(['/file'], { queryParams: { path: node.path } });
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
