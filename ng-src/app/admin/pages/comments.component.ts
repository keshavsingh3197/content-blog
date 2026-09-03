import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommentBan, CommentsService, ModeratedComment } from '../../core/services/comments.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../services/toast.service';
import { BrandDataTableComponent, BrandTableColumn } from '@keshavsingh3197/web-ui';

/**
 * Comment moderation.
 *
 * Comments are published the moment an approved reader posts them, so this screen is the correction
 * mechanism rather than a gate: hide something that should not be on the page, delete it outright,
 * or stop an account from posting again. Hiding is preferred to deleting — a hidden comment is off
 * the page but still on the record.
 */
@Component({
  selector: 'app-admin-comments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, BrandDataTableComponent],
  animations: [
    trigger('rowIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-4px)' }),
        animate('160ms ease-out', style({ opacity: 1, transform: 'none' })),
      ]),
    ]),
  ],
  template: `
    <section class="page-head">
      <div>
        <h1 class="page-title">Comments</h1>
        <p class="page-sub">Reader comments across the blog. Newest first.</p>
      </div>
      <button class="btn-primary" (click)="reload()" [disabled]="loading()">
        <i class="fas fa-rotate"></i> Refresh
      </button>
    </section>

    <div class="panel">
      <p class="muted pad" *ngIf="loading()">Loading…</p>

      <brand-data-table
        *ngIf="!loading()"
        [columns]="columns"
        [rows]="comments()"
        [trackBy]="trackRow"
        searchPlaceholder="Search by reader, comment text or document…"
        defaultSortKey="createdAt"
        defaultSortDir="desc"
      >
        <ng-template let-c>
          <tr @rowIn>
            <td>
              <div class="cell-user">
                <span>
                  <strong>{{ c.displayName }}</strong>
                  <!-- Plain-text binding, exactly as the public page renders it. -->
                  <small class="comment-preview">{{ c.body || '(deleted)' }}</small>
                </span>
              </div>
            </td>
            <td><small class="muted">{{ c.path }}</small></td>
            <td class="muted">{{ c.createdAt | date: 'dd MMM yyyy, HH:mm' }}</td>
            <td>
              <span class="badge off" *ngIf="c.isDeleted">Deleted</span>
              <span class="badge off" *ngIf="c.isHidden && !c.isDeleted"
                    [title]="c.hiddenReason || ''">Hidden</span>
              <span class="badge on" *ngIf="!c.isHidden && !c.isDeleted">Visible</span>
            </td>
            <td class="row-actions">
              <ng-container *ngIf="!c.isDeleted">
                <button class="icon-btn" *ngIf="!c.isHidden" title="Hide from the page"
                        (click)="hide(c)"><i class="fas fa-eye-slash"></i></button>
                <button class="icon-btn" *ngIf="c.isHidden" title="Put back on the page"
                        (click)="unhide(c)"><i class="fas fa-eye"></i></button>
                <button class="icon-btn danger" title="Delete permanently"
                        (click)="remove(c)"><i class="fas fa-trash"></i></button>
              </ng-container>
              <button class="icon-btn danger" title="Stop this account commenting"
                      (click)="ban(c)" *ngIf="!isBanned(c.userId)">
                <i class="fas fa-user-slash"></i>
              </button>
              <button class="icon-btn" title="Allow this account to comment again"
                      (click)="unban(c.userId)" *ngIf="isBanned(c.userId)">
                <i class="fas fa-user-check"></i>
              </button>
            </td>
          </tr>
        </ng-template>
        <div table-empty>No comments to show.</div>
      </brand-data-table>
    </div>

    <div class="panel" *ngIf="bans().length">
      <h2 class="panel-heading">Blocked from commenting</h2>
      <brand-data-table
        [columns]="banColumns"
        [rows]="bans()"
        [trackBy]="trackBanRow"
        [paginate]="false"
        searchPlaceholder="Search blocked readers…"
        defaultSortKey="createdAt"
        defaultSortDir="desc"
      >
        <ng-template let-b>
          <tr>
            <td><strong>{{ b.displayName }}</strong></td>
            <td class="muted">{{ b.reason || '—' }}</td>
            <td class="muted">{{ b.createdAt | date: 'dd MMM yyyy' }}</td>
            <td class="row-actions">
              <button class="icon-btn" title="Unblock" (click)="unban(b.userId)">
                <i class="fas fa-user-check"></i>
              </button>
            </td>
          </tr>
        </ng-template>
        <div table-empty>Nobody is blocked.</div>
      </brand-data-table>
    </div>
  `
})
export class AdminCommentsComponent implements OnInit {
  readonly loading = signal(false);
  readonly comments = signal<ModeratedComment[]>([]);
  readonly bans = signal<CommentBan[]>([]);

  /**
   * `value` feeds search, sort and the filter dropdowns, so each returns the text its cell shows.
   * Document and State are `filterable`, which replaces the old path box and the "show hidden &
   * deleted" checkbox with dropdowns of the values actually present.
   */
  readonly columns: BrandTableColumn<ModeratedComment>[] = [
    { key: 'comment', label: 'Comment', value: c => `${c.displayName} ${c.body ?? ''}` },
    { key: 'path', label: 'Document', value: c => c.path, filterable: true },
    { key: 'createdAt', label: 'Posted', value: c => c.createdAt },
    { key: 'state', label: 'State', value: c => this.state(c), filterable: true },
    { key: 'actions', label: '' },
  ];

  readonly banColumns: BrandTableColumn<CommentBan>[] = [
    { key: 'displayName', label: 'Reader', value: b => b.displayName },
    { key: 'reason', label: 'Reason', value: b => b.reason ?? '' },
    { key: 'createdAt', label: 'Since', value: b => b.createdAt },
    { key: 'actions', label: '' },
  ];

  private state(c: ModeratedComment): string {
    if (c.isDeleted) return 'Deleted';
    return c.isHidden ? 'Hidden' : 'Visible';
  }

  private readonly api = inject(CommentsService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.reload();
    this.loadBans();
  }

  reload(): void {
    this.loading.set(true);
    // Fetched whole and filtered in the browser by brand-data-table. The API still accepts a
    // path, but running both would put two filters for the same thing on one screen.
    this.api.moderationList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: rows => {
          this.comments.set(rows);
          this.loading.set(false);
        },
        error: (e) => {
          this.toast.fromError(e, 'Could not load comments.');
          this.loading.set(false);
        },
      });
  }

  isBanned(userId: string): boolean {
    return this.bans().some(b => b.userId === userId);
  }

  hide(c: ModeratedComment): void {
    const reason = prompt('Why is this being hidden? (optional, for the record)') ?? undefined;
    this.api.hide(c.id, reason)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.patch(c.id, { isHidden: true, hiddenReason: reason ?? null });
          this.toast.success('Comment hidden.');
        },
        error: (e) => this.toast.fromError(e, 'Could not hide that comment.'),
      });
  }

  unhide(c: ModeratedComment): void {
    this.api.unhide(c.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.patch(c.id, { isHidden: false, hiddenReason: null });
          this.toast.success('Comment restored.');
        },
        error: (e) => this.toast.fromError(e, 'Could not restore that comment.'),
      });
  }

  remove(c: ModeratedComment): void {
    if (!confirm(`Delete this comment by ${c.displayName}? The text cannot be recovered.`)) return;

    this.api.remove(c.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.patch(c.id, { isDeleted: true, body: '' });
          this.toast.success('Comment deleted.');
        },
        error: (e) => this.toast.fromError(e, 'Could not delete that comment.'),
      });
  }

  ban(c: ModeratedComment): void {
    if (c.userId === this.auth.user()?.id) {
      this.toast.error('You cannot block your own account.');
      return;
    }
    if (!confirm(`Stop ${c.displayName} from posting new comments?`)) return;

    const reason = prompt('Reason (optional, for the record)') ?? undefined;
    this.api.ban(c.userId, reason)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ban => {
          this.bans.set([ban, ...this.bans().filter(b => b.userId !== ban.userId)]);
          this.toast.success(`${ban.displayName} can no longer comment.`);
        },
        error: (e) => this.toast.fromError(e, 'Could not block that account.'),
      });
  }

  unban(userId: string): void {
    this.api.unban(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.bans.set(this.bans().filter(b => b.userId !== userId));
          this.toast.success('Account unblocked.');
        },
        error: (e) => this.toast.fromError(e, 'Could not unblock that account.'),
      });
  }

  trackRow = (c: ModeratedComment) => c.id;
  trackBanRow = (b: CommentBan) => b.userId;

  private loadBans(): void {
    this.api.bans()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: rows => this.bans.set(rows),
        error: (e) => this.toast.fromError(e, 'Could not load the block list.'),
      });
  }

  private patch(id: string, changes: Partial<ModeratedComment>): void {
    this.comments.set(this.comments().map(c => (c.id === id ? { ...c, ...changes } : c)));
  }
}
