import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '../../../core/services/i18n.service';
import { SearchOverlayService } from '../../../core/services/search-overlay.service';

/**
 * The hero's search affordance.
 *
 * This used to be a second, independent search implementation — its own debounce, its own result
 * list, its own (unranked) matcher — that existed only on the home page. It now opens the global
 * palette, so there is one search on the site: one ranking, one keyboard model, one place to fix a
 * bug. Tapping it on a phone opens the palette, which focuses its field, so the keyboard still
 * comes up on the first tap exactly as it did for a real input.
 */
@Component({
  selector: 'app-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="hero-search" (click)="open()">
      <i class="fas fa-search hero-search-icon" aria-hidden="true"></i>
      <span class="hero-search-text">{{ i18n.t('blog.search.placeholder') }}</span>
      <kbd class="hero-search-kbd">/</kbd>
    </button>
  `,
})
export class SearchLauncherComponent {
  protected readonly i18n = inject(I18nService);
  private readonly overlay = inject(SearchOverlayService);

  open(): void {
    this.overlay.open();
  }
}
