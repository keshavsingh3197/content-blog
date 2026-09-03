import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminApiService } from '../services/admin-api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../services/toast.service';
import { BrandDataTableComponent, BrandTableColumn } from '@keshavsingh3197/web-ui';
import { ContentListItem } from '../admin.models';

@Component({
  selector: 'app-admin-content-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, BrandDataTableComponent],
  template: `
    <section class="page-head">
      <div><h1 class="page-title">Content</h1>
        <p class="page-sub">Create and manage the topics your blog renders.</p></div>
      <a class="btn-primary" routerLink="/admin/content/new" *ngIf="canWrite()">
        <i class="fas fa-plus"></i> New topic
      </a>
    </section>

    <div class="panel">
      <brand-data-table
        [columns]="columns"
        [rows]="items()"
        [trackBy]="trackRow"
        searchPlaceholder="Search topics…"
        defaultSortKey="updatedAt"
        defaultSortDir="desc"
      >
        <ng-template let-c>
          <tr @rowIn>
            <td><strong>{{ c.title }}</strong><small class="muted d-block">/{{ c.slug }}</small></td>
            <td><span class="pill folder"><i class="fas fa-folder"></i> {{ c.folder || '—' }}</span></td>
            <td><span class="tag" *ngFor="let t of c.tags">#{{ t }}</span></td>
            <td>
              <span class="badge" [class.on]="c.published" [class.off]="!c.published">
                {{ c.published ? 'Published' : 'Draft' }}
              </span>
            </td>
            <td class="muted">{{ c.updatedAt | date:'MMM d, y' }}</td>
            <td class="row-actions">
              <a class="icon-btn" [routerLink]="['/admin/content', c.id]" title="Edit" *ngIf="canWrite()">
                <i class="fas fa-pen"></i></a>
              <button class="icon-btn danger" (click)="remove(c)" title="Delete" *ngIf="canWrite()">
                <i class="fas fa-trash"></i></button>
            </td>
          </tr>
        </ng-template>
        <div table-empty><i class="fas fa-file-circle-plus"></i> No topics found.</div>
      </brand-data-table>
    </div>
  `,
  animations: [trigger('rowIn', [transition(':enter', [
    style({ opacity: 0, transform: 'translateY(6px)' }),
    animate('220ms ease-out', style({ opacity: 1, transform: 'none' })),
  ])])],
})
export class ContentListComponent implements OnInit {
  private api = inject(AdminApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  items = signal<ContentListItem[]>([]);
  loading = signal(true);

  canWrite = computed(() => this.auth.hasRole('Admin', 'Editor'));

  /**
   * `value` drives search, sort and the filter dropdowns, so each one returns the text the cell
   * shows. Tags opt out of sorting — ordering a list by a joined tag string is meaningless — but
   * keep a `value` so a tag still matches the search box.
   */
  readonly columns: BrandTableColumn<ContentListItem>[] = [
    { key: 'title', label: 'Title', value: c => c.title },
    { key: 'folder', label: 'Folder', value: c => c.folder, filterable: true },
    { key: 'tags', label: 'Tags', value: c => c.tags.join(' '), sortable: false },
    { key: 'published', label: 'Status', value: c => (c.published ? 'Published' : 'Draft'), filterable: true },
    { key: 'updatedAt', label: 'Updated', value: c => c.updatedAt },
    { key: 'actions', label: '' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    // The list is fetched whole and filtered in the browser by brand-data-table. The API still
    // accepts a `q`, but running both would put two search boxes on one screen.
    this.api.listContent()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: c => { this.items.set(c); this.loading.set(false); },
        error: e => { this.loading.set(false); this.toast.fromError(e); },
      });
  }

  remove(c: ContentListItem): void {
    if (!confirm(`Delete "${c.title}"?`)) return;
    this.api.deleteContent(c.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.toast.success('Topic deleted.'); this.load(); },
        error: e => this.toast.fromError(e),
      });
  }

  trackRow = (c: ContentListItem) => c.id;
}
