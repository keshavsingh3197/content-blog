import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../services/i18n.service';

/**
 * `{{ 'blog.nav.home' | t }}` — the terse form of {@link I18nService.t}.
 *
 * Deliberately pure: the lookup reads a signal, so Angular re-evaluates the pipe when the bundle or
 * the language changes, without running it on every change-detection pass.
 */
@Pipe({ name: 't', standalone: true })
export class TranslatePipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
