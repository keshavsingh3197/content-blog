import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { I18nService } from '../../core/services/i18n.service';
import { SearchOverlayService } from '../../core/services/search-overlay.service';

/**
 * The catch-all route.
 *
 * It used to redirect silently to the home page, which meant a mistyped or stale link — and
 * `ContentService.rewriteDocumentLinks` produces one whenever a relative markdown link is broken —
 * dumped the reader on the home page with no indication that anything had gone wrong. Saying so,
 * and offering search, is both more honest and faster to recover from.
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule],
  template: `
    <div class="container mt-4">
      <div class="empty-state empty-state-lg">
        <span class="not-found-code" aria-hidden="true">404</span>
        <h1 class="empty-state-title">{{ i18n.t('blog.notFound.title') }}</h1>
        <p class="empty-state-text">{{ i18n.t('blog.notFound.body') }}</p>
        <div class="empty-state-actions">
          <a class="btn-solid" [routerLink]="['/']">
            <i class="fas fa-house" aria-hidden="true"></i>{{ i18n.t('blog.notFound.home') }}
          </a>
          <button type="button" class="btn-outline" (click)="openSearch()">
            <i class="fas fa-search" aria-hidden="true"></i>{{ i18n.t('blog.notFound.search') }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class NotFoundComponent {
  protected readonly i18n = inject(I18nService);
  private readonly overlay = inject(SearchOverlayService);

  openSearch(): void {
    this.overlay.open();
  }
}
