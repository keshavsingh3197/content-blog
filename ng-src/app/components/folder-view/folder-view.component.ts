import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, switchMap, map } from 'rxjs/operators';
import { ContentService } from '../../services/content.service';
import { FileNode } from '../../models/file-node.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../breadcrumb/breadcrumb.component';

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
            <i class="fas fa-folder-open me-2 text-primary"></i>{{ folderNode.name }}
          </h2>
          <div class="row">
            <div class="col-6 col-md-4 col-lg-3 mb-3" *ngFor="let folder of subFolders; let i = index">
              <button
                class="topic-card w-100"
                [style.background]="folderColor(i)"
                (click)="openFolder(folder)"
                [attr.aria-label]="'Browse ' + folder.name"
              >
                <i class="fas fa-folder text-white topic-icon"></i>
                <div class="topic-title">{{ folder.name }}</div>
                <div class="topic-count">{{ childFileCount(folder) }} files</div>
              </button>
            </div>
          </div>
        </div>

        <!-- Files in this folder -->
        <div *ngIf="files.length > 0">
          <h2 class="section-heading mb-3">
            <i class="fas fa-file-alt me-2 text-primary"></i>Files
          </h2>
          <div class="sidebar-panel">
            <ul class="tree-list">
              <li class="tree-item" *ngFor="let file of files">
                <div
                  class="tree-file"
                  (click)="openFile(file)"
                  role="button"
                  tabindex="0"
                  (keydown.enter)="openFile(file)"
                >
                  <i class="fas fa-file-alt me-2 text-primary"></i>
                  <span>{{ file.name }}</span>
                </div>
              </li>
            </ul>
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
