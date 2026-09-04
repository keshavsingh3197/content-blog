import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject
} from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';

/**
 * The scroll-to-top control.
 *
 * It used to be declared inside the article view, which meant the home page — the longest page on
 * the site, with the whole file tree on it — and the folder and tag listings had no way back to the
 * top but a manual scroll. Rendering it from `AppComponent` gives every route the same affordance
 * and leaves one implementation to maintain.
 */
@Component({
  selector: 'app-back-to-top',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="back-to-top no-print"
      [class.visible]="visible"
      [attr.tabindex]="visible ? 0 : -1"
      [attr.aria-hidden]="!visible"
      (click)="scrollToTop()"
      [attr.aria-label]="i18n.t('blog.content.backToTop')"
      [title]="i18n.t('blog.content.backToTop')"
    ><i class="fas fa-arrow-up" aria-hidden="true"></i></button>
  `,
})
export class BackToTopComponent implements OnInit, OnDestroy {
  protected readonly i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);

  visible = false;

  private readonly onScroll = () => {
    const next = window.scrollY > 400;
    if (next === this.visible) return;
    this.visible = next;
    this.cdr.markForCheck();
  };

  ngOnInit(): void {
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.onScroll();
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
  }

  scrollToTop(): void {
    // `smooth` is honoured by the browser; the reduced-motion rule in _accessibility.scss forces
    // `scroll-behavior: auto`, so a reader who asked for no motion gets an instant jump.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
