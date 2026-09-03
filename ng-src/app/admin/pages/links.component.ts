import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminApiService } from '../services/admin-api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../services/toast.service';
import { BrandDataTableComponent, BrandTableColumn } from '@keshavsingh3197/web-ui';
import { Link } from '../admin.models';

interface LinkModel {
  id?: string;
  title: string;
  url: string;
  category: string;
  description: string;
  icon: string;
  order: number;
  visible: boolean;
}

@Component({
  selector: 'app-admin-links',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, BrandDataTableComponent],
  template: `
    <section class="page-head">
      <div><h1 class="page-title">Links</h1>
        <p class="page-sub">Curated links &amp; resources the blog can render.</p></div>
      <button class="btn-primary" (click)="openCreate()" *ngIf="canWrite()">
        <i class="fas fa-plus"></i> Add link
      </button>
    </section>

    <div class="panel">
      <brand-data-table
        [columns]="columns"
        [rows]="links()"
        [trackBy]="trackRow"
        searchPlaceholder="Search links…"
        defaultSortKey="order"
      >
        <ng-template let-l>
          <tr @rowIn>
            <td>
              <div class="cell-user">
                <span class="link-ico"><i class="fas" [ngClass]="l.icon || 'fa-link'"></i></span>
                <span>
                  <strong>{{ l.title }}</strong>
                  <small><a [href]="l.url" target="_blank" rel="noopener" class="muted">{{ l.url }}</a></small>
                </span>
              </div>
            </td>
            <td><span class="pill folder" *ngIf="l.category">{{ l.category }}</span>
              <span class="muted" *ngIf="!l.category">—</span></td>
            <td class="muted">{{ l.order }}</td>
            <td>
              <span class="badge" [class.on]="l.visible" [class.off]="!l.visible">
                {{ l.visible ? 'Visible' : 'Hidden' }}
              </span>
            </td>
            <td class="row-actions" *ngIf="canWrite()">
              <button class="icon-btn" (click)="openEdit(l)" title="Edit"><i class="fas fa-pen"></i></button>
              <button class="icon-btn danger" (click)="remove(l)" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
            <td *ngIf="!canWrite()"></td>
          </tr>
        </ng-template>
        <div table-empty><i class="fas fa-link-slash"></i> No links yet.</div>
      </brand-data-table>
    </div>

    <div class="admin-dialog-scrim" *ngIf="editing()" (click)="close()">
      <div class="admin-dialog" (click)="$event.stopPropagation()" @modalIn>
        <div class="admin-dialog-head">
          <h3>{{ model.id ? 'Edit link' : 'Add link' }}</h3>
          <button class="icon-btn" (click)="close()"><i class="fas fa-xmark"></i></button>
        </div>
        <form class="admin-dialog-body" (ngSubmit)="save()">
          <label class="field"><span>Title</span>
            <div class="field-input"><i class="fas fa-heading"></i>
              <input name="t" [(ngModel)]="model.title" required placeholder="Angular docs"></div>
          </label>
          <label class="field"><span>URL</span>
            <div class="field-input"><i class="fas fa-link"></i>
              <input name="u" [(ngModel)]="model.url" required placeholder="https://angular.dev"></div>
          </label>
          <div class="grid-2">
            <label class="field"><span>Category</span>
              <div class="field-input"><i class="fas fa-folder"></i>
                <input name="c" [(ngModel)]="model.category" placeholder="Frameworks"></div>
            </label>
            <label class="field"><span>Icon <small class="muted">(FA class)</small></span>
              <div class="field-input"><i class="fas" [ngClass]="model.icon || 'fa-link'"></i>
                <input name="i" [(ngModel)]="model.icon" placeholder="fa-angular"></div>
            </label>
          </div>
          <label class="field"><span>Description <small class="muted">(optional)</small></span>
            <div class="field-input"><i class="fas fa-align-left"></i>
              <input name="d" [(ngModel)]="model.description" placeholder="Official Angular documentation"></div>
          </label>
          <div class="grid-2">
            <label class="field"><span>Order</span>
              <div class="field-input"><i class="fas fa-sort"></i>
                <input type="number" name="o" [(ngModel)]="model.order"></div>
            </label>
            <label class="switch-row">
              <span>Visible on blog</span>
              <input type="checkbox" name="v" [(ngModel)]="model.visible"><span class="switch"></span>
            </label>
          </div>
          <div class="admin-dialog-foot">
            <button type="button" class="btn-ghost" (click)="close()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="busy()">
              <i class="fas fa-spinner fa-spin" *ngIf="busy()"></i> Save
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  animations: [
    trigger('rowIn', [transition(':enter', [
      style({ opacity: 0, transform: 'translateY(6px)' }),
      animate('220ms ease-out', style({ opacity: 1, transform: 'none' }))])]),
    trigger('modalIn', [transition(':enter', [
      style({ opacity: 0, transform: 'translateY(18px) scale(0.98)' }),
      animate('260ms cubic-bezier(0.16,1,0.3,1)', style({ opacity: 1, transform: 'none' }))])]),
  ],
})
export class LinksComponent implements OnInit {
  private api = inject(AdminApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  links = signal<Link[]>([]);
  loading = signal(true);
  editing = signal(false);
  busy = signal(false);
  model: LinkModel = this.blank();

  canWrite = computed(() => this.auth.hasRole('Admin', 'Editor'));

  /**
   * `value` feeds search, sort and the filter dropdowns, so it must produce the same text the cell
   * shows — the Visible column renders a badge, not the boolean, so searching "Hidden" works.
   * The actions column has no value and is therefore never sortable.
   */
  readonly columns: BrandTableColumn<Link>[] = [
    { key: 'title', label: 'Link', value: l => l.title },
    { key: 'category', label: 'Category', value: l => l.category ?? '', filterable: true },
    { key: 'order', label: 'Order', value: l => l.order },
    { key: 'visible', label: 'Visible', value: l => (l.visible ? 'Visible' : 'Hidden'), filterable: true },
    { key: 'actions', label: '' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.listLinks()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: l => { this.links.set(l); this.loading.set(false); },
        error: e => { this.loading.set(false); this.toast.fromError(e); },
      });
  }

  openCreate(): void { this.model = this.blank(); this.editing.set(true); }

  openEdit(l: Link): void {
    this.model = {
      id: l.id, title: l.title, url: l.url, category: l.category ?? '',
      description: l.description ?? '', icon: l.icon ?? '', order: l.order, visible: l.visible,
    };
    this.editing.set(true);
  }

  close(): void { this.editing.set(false); }

  save(): void {
    if (!this.model.title.trim() || !this.model.url.trim()) {
      this.toast.error('Title and URL are required.'); return;
    }
    this.busy.set(true);
    const body: Partial<Link> = {
      title: this.model.title.trim(),
      url: this.model.url.trim(),
      category: this.model.category.trim() || null,
      description: this.model.description.trim() || null,
      icon: this.model.icon.trim() || null,
      order: Number(this.model.order) || 0,
      visible: this.model.visible,
    };
    const done = () => { this.busy.set(false); this.editing.set(false); this.load(); };
    const fail = (e: any) => { this.busy.set(false); this.toast.fromError(e); };
    const req = this.model.id ? this.api.updateLink(this.model.id, body) : this.api.createLink(body);
    req.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => { this.toast.success('Saved.'); done(); }, error: fail });
  }

  remove(l: Link): void {
    if (!confirm(`Delete "${l.title}"?`)) return;
    this.api.deleteLink(l.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.toast.success('Link deleted.'); this.load(); },
        error: e => this.toast.fromError(e),
      });
  }

  trackRow = (l: Link) => l.id;

  private blank(): LinkModel {
    return { title: '', url: '', category: '', description: '', icon: '', order: 0, visible: true };
  }
}
