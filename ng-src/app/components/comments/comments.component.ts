import {
  Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ADMIN_APP_URL } from '../../admin/api.config';
import { AuthService } from '../../admin/services/auth.service';
import { Comment, CommentsService } from '../../services/comments.service';
import { I18nService } from '../../services/i18n.service';

/**
 * The discussion under a document.
 *
 * Reading is open to everyone; writing is not, and there is no anonymous option — a reader posts as
 * an approved account or not at all. Someone without one is pointed at the request form rather than
 * a sign-up, because on this site an account is granted, not taken.
 *
 * Comment text is bound through interpolation only. It is plain text server-side and stays plain
 * text here: nothing on this page ever puts a comment through `innerHTML`.
 */
@Component({
  selector: 'app-comments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="comments no-print" *ngIf="path">
      <h2 class="comments-heading">
        <i class="fas fa-comments me-2"></i>{{ i18n.t('blog.comments.title') }}
        <span class="section-count" *ngIf="comments.length">{{ comments.length }}</span>
      </h2>

      <div class="comments-state" *ngIf="loading">
        <i class="fas fa-spinner fa-spin me-2"></i>{{ i18n.t('common.state.loading') }}
      </div>

      <div class="alert alert-warning" *ngIf="loadError">
        <i class="fas fa-exclamation-triangle me-2"></i>{{ i18n.t('blog.comments.loadFailed') }}
      </div>

      <ng-container *ngIf="!loading && !loadError">
        <p class="comments-empty" *ngIf="!comments.length">{{ i18n.t('blog.comments.empty') }}</p>

        <ol class="comment-list" *ngIf="comments.length">
          <li class="comment" *ngFor="let c of comments">
            <div class="comment-head">
              <span class="comment-author">{{ c.displayName }}</span>
              <span class="comment-date">{{ i18n.formatDate(c.createdAt) }}</span>
              <span class="comment-edited" *ngIf="c.editedAt">{{ i18n.t('blog.comments.edited') }}</span>

              <span class="comment-actions" *ngIf="c.isMine">
                <button type="button" class="comment-action" (click)="startEdit(c)"
                        *ngIf="editingId !== c.id">{{ i18n.t('common.actions.edit') }}</button>
                <button type="button" class="comment-action comment-action-danger"
                        (click)="remove(c)">{{ i18n.t('common.actions.delete') }}</button>
              </span>
            </div>

            <!-- Reading view. Plain text; white-space:pre-wrap in CSS keeps the author's line breaks. -->
            <p class="comment-body" *ngIf="editingId !== c.id">{{ c.body }}</p>

            <!-- Editing view -->
            <div class="comment-edit" *ngIf="editingId === c.id">
              <textarea
                class="comment-input"
                rows="4"
                [maxlength]="maxLength"
                [(ngModel)]="editDraft"
                [attr.aria-label]="i18n.t('blog.comments.editLabel')"></textarea>
              <div class="comment-form-foot">
                <span class="comment-count">{{ editDraft.length }} / {{ maxLength }}</span>
                <span class="comment-form-buttons">
                  <button type="button" class="btn-ghost" (click)="cancelEdit()">
                    {{ i18n.t('common.actions.cancel') }}
                  </button>
                  <button type="button" class="btn-accent" [disabled]="saving || !isValid(editDraft)"
                          (click)="saveEdit(c)">
                    {{ i18n.t('common.actions.save') }}
                  </button>
                </span>
              </div>
            </div>
          </li>
        </ol>
      </ng-container>

      <!-- Composer, for a signed-in reader -->
      <form class="comment-form" *ngIf="auth.isAuthenticated()" (ngSubmit)="post()">
        <label class="comment-form-label" for="comment-body">
          {{ i18n.t('blog.comments.postingAs', { name: authorName() }) }}
        </label>
        <textarea
          id="comment-body"
          class="comment-input"
          rows="4"
          [maxlength]="maxLength"
          [(ngModel)]="draft"
          name="body"
          [placeholder]="i18n.t('blog.comments.placeholder')"></textarea>

        <div class="alert alert-danger comment-error" *ngIf="postError">
          <i class="fas fa-circle-exclamation me-2"></i>{{ postError }}
        </div>

        <div class="comment-form-foot">
          <span class="comment-count">{{ draft.length }} / {{ maxLength }}</span>
          <button type="submit" class="btn-accent" [disabled]="saving || !isValid(draft)">
            <i class="fas fa-paper-plane me-2"></i>{{ i18n.t('blog.comments.post') }}
          </button>
        </div>
      </form>

      <!-- Signed out: sign in, or ask for an account -->
      <div class="comment-signin" *ngIf="!auth.isAuthenticated()">
        <p class="comment-signin-text">{{ i18n.t('blog.comments.signInPrompt') }}</p>
        <div class="comment-signin-actions">
          <button type="button" class="btn-accent" (click)="signIn()">
            <i class="fas fa-right-to-bracket me-2"></i>{{ i18n.t('blog.comments.signIn') }}
          </button>
          <a class="btn-ghost" [href]="requestAccountUrl">
            <i class="fas fa-user-plus me-2"></i>{{ i18n.t('blog.comments.requestAccount') }}
          </a>
        </div>
        <p class="comment-signin-note">{{ i18n.t('blog.comments.approvalNote') }}</p>
      </div>
    </section>
  `
})
export class CommentsComponent implements OnChanges {
  /** Content path of the document being read. Empty until the reader has resolved one. */
  @Input() path = '';

  readonly maxLength = 4000;
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);

  comments: Comment[] = [];
  loading = false;
  loadError = false;
  saving = false;
  postError = '';

  draft = '';
  editingId: string | null = null;
  editDraft = '';

  private readonly comments$ = inject(CommentsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly adminApp = inject(ADMIN_APP_URL);

  /** The identity provider owns the request form, because it owns accounts. */
  readonly requestAccountUrl = `${this.adminApp}/request-account`;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['path']) this.load();
  }

  authorName(): string {
    return this.auth.user()?.displayName || this.i18n.t('blog.comments.you');
  }

  isValid(text: string): boolean {
    return text.trim().length >= 2 && text.trim().length <= this.maxLength;
  }

  signIn(): void {
    this.auth.loginRedirect();
  }

  post(): void {
    if (!this.isValid(this.draft) || this.saving) return;
    this.saving = true;
    this.postError = '';

    this.comments$.post(this.path, this.draft.trim()).subscribe({
      next: comment => {
        this.comments = [...this.comments, comment];
        this.draft = '';
        this.saving = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.postError = this.messageFor(err);
        this.saving = false;
        this.cdr.markForCheck();
      },
    });
  }

  startEdit(c: Comment): void {
    this.editingId = c.id;
    this.editDraft = c.body;
    this.postError = '';
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editDraft = '';
  }

  saveEdit(c: Comment): void {
    if (!this.isValid(this.editDraft) || this.saving) return;
    this.saving = true;

    this.comments$.update(c.id, this.editDraft.trim()).subscribe({
      next: updated => {
        this.comments = this.comments.map(x => (x.id === updated.id ? updated : x));
        this.cancelEdit();
        this.saving = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.postError = this.messageFor(err);
        this.saving = false;
        this.cdr.markForCheck();
      },
    });
  }

  remove(c: Comment): void {
    if (!confirm(this.i18n.t('blog.comments.confirmDelete'))) return;

    this.comments$.remove(c.id).subscribe({
      next: () => {
        this.comments = this.comments.filter(x => x.id !== c.id);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.postError = this.messageFor(err);
        this.cdr.markForCheck();
      },
    });
  }

  private load(): void {
    this.comments = [];
    this.editingId = null;
    this.postError = '';
    this.loadError = false;

    if (!this.path) return;

    this.loading = true;
    this.cdr.markForCheck();

    this.comments$.thread(this.path).subscribe({
      next: thread => {
        this.comments = thread.comments;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        // A thread that will not load must not take the article down with it.
        this.loadError = true;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Turn a failure into something the reader can act on. The server's own message is used for the
   * cases it words deliberately (banned, edit window closed, too fast); anything else gets a generic
   * line rather than leaking a status code or a stack.
   */
  private messageFor(err: HttpErrorResponse): string {
    if (err.status === 401) return this.i18n.t('blog.comments.errorSignedOut');
    if (err.status === 429) return this.i18n.t('blog.comments.errorTooMany');

    const serverMessage = typeof err.error?.error === 'string' ? err.error.error.trim() : '';
    if ((err.status === 403 || err.status === 400) && serverMessage) return serverMessage;

    return this.i18n.t('blog.comments.errorGeneric');
  }
}
