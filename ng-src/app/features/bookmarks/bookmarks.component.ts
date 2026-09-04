import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { I18nService } from '../../core/services/i18n.service';
import { LibraryEntry, LibraryService } from '../../core/services/library.service';
import { SearchOverlayService } from '../../core/services/search-overlay.service';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';

/**
 * The reader's own shelf: saved documents, and what they have read recently.
 *
 * Both lists come from {@link LibraryService}, which keeps them in this browser only — the blog has
 * no reader accounts, so the alternative to browser storage is not "synced across devices", it is
 * "an identity system for a bookmark button". The page says so plainly rather than letting someone
 * assume their list follows them.
 */
@Component({
  selector: 'app-bookmarks',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, BreadcrumbComponent, RevealDirective],
  template: `
    <div class="container mt-4">
      <app-breadcrumb [items]="breadcrumbs"></app-breadcrumb>

      <h1 class="section-heading mb-2">
        <i class="fas fa-bookmark" aria-hidden="true"></i>{{ i18n.t('blog.bookmarks.title') }}
        <span class="section-count" *ngIf="library.bookmarkCount()">{{ library.bookmarkCount() }}</span>
      </h1>
      <p class="tags-subtitle">{{ i18n.t('blog.bookmarks.subtitle') }}</p>

      <!-- Saved -->
      <div class="empty-state" *ngIf="!library.bookmarks().length">
        <i class="fas fa-bookmark empty-state-icon" aria-hidden="true"></i>
        <p class="empty-state-text">{{ i18n.t('blog.bookmarks.empty') }}</p>
        <div class="empty-state-actions">
          <a class="btn-solid" [routerLink]="['/']">
            <i class="fas fa-house" aria-hidden="true"></i>{{ i18n.t('blog.bookmarks.browse') }}
          </a>
          <button type="button" class="btn-outline" (click)="openSearch()">
            <i class="fas fa-search" aria-hidden="true"></i>{{ i18n.t('blog.search.open') }}
          </button>
        </div>
      </div>

      <div class="doc-list" *ngIf="library.bookmarks().length">
        <div class="doc-card doc-card-static" *ngFor="let entry of library.bookmarks(); let i = index"
             [appReveal]="i * 30">
          <span class="doc-index doc-index-plain"><i class="fas fa-bookmark" aria-hidden="true"></i></span>
          <a class="doc-body" [routerLink]="['/file']" [queryParams]="{ path: entry.path }">
            <span class="doc-title">{{ entry.title }}</span>
            <span class="doc-file">{{ entry.path }}</span>
          </a>
          <button
            type="button"
            class="doc-remove"
            (click)="library.removeBookmark(entry.path)"
            [attr.aria-label]="i18n.t('blog.bookmarks.remove')"
            [title]="i18n.t('blog.bookmarks.remove')"
          ><i class="fas fa-trash-can" aria-hidden="true"></i></button>
        </div>
      </div>

      <!-- History -->
      <div class="list-head mt-4">
        <h2 class="section-heading">
          <i class="fas fa-clock-rotate-left" aria-hidden="true"></i>{{ i18n.t('blog.bookmarks.historyTitle') }}
        </h2>
        <button
          type="button"
          class="btn-outline btn-sm"
          *ngIf="library.history().length"
          (click)="clearHistory()"
        >
          <i class="fas fa-eraser" aria-hidden="true"></i>{{ i18n.t('blog.bookmarks.clearHistory') }}
        </button>
      </div>

      <p class="comments-empty" *ngIf="!library.history().length">
        {{ i18n.t('blog.bookmarks.historyEmpty') }}
      </p>

      <div class="history-list" *ngIf="library.history().length">
        <a
          class="history-row"
          *ngFor="let entry of library.history()"
          [routerLink]="['/file']"
          [queryParams]="{ path: entry.path }"
        >
          <i class="fas fa-file-lines" aria-hidden="true"></i>
          <span class="history-title">{{ entry.title }}</span>
          <span class="history-date">{{ formatWhen(entry) }}</span>
        </a>
      </div>
    </div>
  `
})
export class BookmarksComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly library = inject(LibraryService);

  private readonly overlay = inject(SearchOverlayService);

  readonly breadcrumbs: BreadcrumbItem[] = [];

  openSearch(): void {
    this.overlay.open();
  }

  clearHistory(): void {
    if (confirm(this.i18n.t('blog.bookmarks.confirmClear'))) this.library.clearHistory();
  }

  /** Entries written before `at` was recorded carry 0; show nothing rather than "1 Jan 1970". */
  formatWhen(entry: LibraryEntry): string {
    return entry.at ? this.i18n.formatDate(new Date(entry.at)) : '';
  }
}
