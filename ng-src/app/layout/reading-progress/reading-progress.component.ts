import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject
} from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';

/**
 * The hairline progress bar under the header.
 *
 * Updates are coalesced into one `requestAnimationFrame` per frame: the scroll handler used to
 * write a property and call `markForCheck()` on every scroll event, which on a trackpad or a
 * high-rate touchscreen fires several times per frame and re-ran change detection for each.
 */
@Component({
  selector: 'app-reading-progress',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="reading-progress-track no-print"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-valuenow]="rounded"
      [attr.aria-label]="i18n.t('blog.content.progress')"
    >
      <div class="reading-progress-bar" [style.width.%]="progress"></div>
    </div>
  `,
})
export class ReadingProgressComponent implements OnInit, OnDestroy {
  protected readonly i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);

  progress = 0;
  rounded = 0;

  private frame = 0;

  private readonly onScroll = () => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const next = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0;
      const nextRounded = Math.round(next);
      if (nextRounded === this.rounded) return;
      this.progress = next;
      this.rounded = nextRounded;
      this.cdr.markForCheck();
    });
  };

  ngOnInit(): void {
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onScroll, { passive: true });
    this.onScroll();
  }

  ngOnDestroy(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
  }
}
