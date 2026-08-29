import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommentBan, CommentsService, ModeratedComment } from '../../services/comments.service';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

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
  imports: [CommonModule, FormsModule],
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
      <div class="filter-bar">
        <input
          class="filter-input"
          type="search"
          placeholder="Filter by document path, e.g. src/CSharp/csharp-interview.md"
          [(ngModel)]="pathFilter"
          (keyup.enter)="reload()" />
        <button class="btn-ghost" (click)="reload()">Apply</button>
        <button class="btn-ghost" (click)="pathFilter = ''; reload()" *ngIf="pathFilter">Clear</button>
        <label class="filter-toggle">
          <input type="checkbox" [(ngModel)]="showRemoved" /> Show hidden &amp; deleted
        </label>
      </div>

      <p class="muted pad" *ngIf="loading()">Loading…</p>
      <p class="muted pad" *ngIf="!loading() && !visible().length">No comments to show.</p>

      <div class="table-wrap" *ngIf="visible().length">
        <table class="admin-table">
          <thead>
            <tr><th>Comment</th><th>Document</th><th>Posted</th><th>State</th><th></th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of visible(); trackBy: trackId" @rowIn>
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
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel" *ngIf="bans().length">
      <h2 class="panel-heading">Blocked from commenting</h2>
      <div class="table-wrap">
        <table class="admin-table">
          <thead><tr><th>Reader</th><th>Reason</th><th>Since</th><th></th></tr></thead>
          <tbody>
            <tr *ngFor="let b of bans(); trackBy: trackBan">
              <td><strong>{{ b.displayName }}</strong></td>
              <td class="muted">{{ b.reason || '—' }}</td>
              <td class="muted">{{ b.createdAt | date: 'dd MMM yyyy' }}</td>
              <td class="row-actions">
                <button class="icon-btn" title="Unblock" (click)="unban(b.userId)">
                  <i class="fas fa-user-check"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class AdminCommentsComponent implements OnInit {
  pathFilter = '';
  showRemoved = true;

  readonly loading = signal(false);
  readonly comments = signal<ModeratedComment[]>([]);
  readonly bans = signal<CommentBan[]>([]);

  /** Hiding removed comments is a display choice; the server always returns everything. */
  readonly visible = computed(() =>
    this.showRemoved
      ? this.comments()
      : this.comments().filter(c => !c.isHidden && !c.isDeleted));

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
    this.api.moderationList(this.pathFilter.trim() || undefined)
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

  trackId = (_: number, c: ModeratedComment) => c.id;
  trackBan = (_: number, b: CommentBan) => b.userId;

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
