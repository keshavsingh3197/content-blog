import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';
import { AdminApiService } from '../services/admin-api.service';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { ContentListItem } from '../admin.models';

@Component({
  selector: 'app-admin-content-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="page-head">
      <div><h1 class="page-title">Content</h1>
        <p class="page-sub">Create and manage the topics your blog renders.</p></div>
      <a class="btn-primary" routerLink="/admin/content/new" *ngIf="canWrite()">
        <i class="fas fa-plus"></i> New topic
      </a>
    </section>

    <div class="panel">
      <div class="toolbar">
        <div class="field-input search">
          <i class="fas fa-magnifying-glass"></i>
          <input [(ngModel)]="query" (input)="search()" placeholder="Search topics…">
        </div>
        <span class="muted">{{ items().length }} topic(s)</span>
      </div>

      <div class="table-wrap">
        <table class="admin-table">
          <thead><tr><th>Title</th><th>Folder</th><th>Tags</th><th>Status</th><th>Updated</th><th></th></tr></thead>
          <tbody>
            <tr *ngFor="let c of items(); trackBy: trackId" @rowIn>
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
            <tr *ngIf="!loading() && items().length === 0">
              <td colspan="6" class="empty-row"><i class="fas fa-file-circle-plus"></i> No topics found.</td>
            </tr>
          </tbody>
        </table>
      </div>
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

  items = signal<ContentListItem[]>([]);
  loading = signal(true);
  query = '';
  private debounce?: ReturnType<typeof setTimeout>;

  canWrite = computed(() => this.auth.hasRole('Admin', 'Editor'));

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.listContent(this.query.trim() || undefined).subscribe({
      next: c => { this.items.set(c); this.loading.set(false); },
      error: e => { this.loading.set(false); this.toast.fromError(e); },
    });
  }

  search(): void {
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.load(), 300);
  }

  remove(c: ContentListItem): void {
    if (!confirm(`Delete "${c.title}"?`)) return;
    this.api.deleteContent(c.id).subscribe({
      next: () => { this.toast.success('Topic deleted.'); this.load(); },
      error: e => this.toast.fromError(e),
    });
  }

  trackId = (_: number, c: ContentListItem) => c.id;
}
