import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, from } from 'rxjs';
import { LocalizationClient, PublicLocale, TranslationBundle } from '@keshavsingh3197/web-config';
import { IDP_BASE } from '../api.config';
import { RuntimeConfigService } from './runtime-config.service';
import { fallbackString } from '../i18n/fallback-strings';

export type { TranslationBundle } from '@keshavsingh3197/web-config';

/**
 * The Angular adapter over {@link LocalizationClient}. Text comes from the identity provider's
 * catalogue (`GET /api/i18n/bundle/{locale}`), not from this build, so a wording fix or a new language
 * is a database edit.
 *
 * In a template: `{{ i18n.t('blog.nav.home') }}` or the `t` pipe. `t()` reads a signal, so switching
 * language re-renders every string in place — no reload, no lost scroll position.
 *
 * Language resolution, fallbacks, interpolation, ETag/version polling and persistence all live in
 * `@keshavsingh3197/web-config`, shared with the admin app and the portfolio.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private config = inject(RuntimeConfigService);

  /** Only the public site's bundles: the admin app's strings are never fetched here. */
  private readonly client = new LocalizationClient({
    apiBase: inject(IDP_BASE),
    namespaces: ['common', 'blog', 'brand'],
    config: this.config.runtime,
  });

  private readonly bundle = signal<TranslationBundle | null>(null);

  readonly locale = computed(() => this.bundle()?.locale ?? '');
  readonly direction = computed<'ltr' | 'rtl'>(() => this.bundle()?.direction ?? 'ltr');
  readonly ready = computed(() => this.bundle() !== null);

  readonly locales = computed<PublicLocale[]>(() => {
    this.config.config();
    this.bundle();
    return this.client.locales;
  });

  /** True only when an admin left the picker on AND more than one language is enabled. */
  readonly showPicker = computed(() => {
    this.config.config();
    this.bundle();
    return this.client.showPicker;
  });

  constructor() {
    // Keep the document in step with the bundle's direction. Without this an RTL locale enabled in
    // the config renders right-to-left text left-to-right — the signal existed but nothing applied
    // it. `lang` moves with it, which is what screen readers and hyphenation read.
    effect(() => {
      const root = document.documentElement;
      root.setAttribute('dir', this.direction());
      const locale = this.locale();
      if (locale) root.setAttribute('lang', locale);
    });

    const off = this.client.onChange((value) => this.bundle.set(value));
    inject(DestroyRef).onDestroy(() => {
      off();
      this.client.dispose();
    });
  }

  /** Loads the manifest and the resolved language's bundle. Call once, after the config has loaded. */
  init(): Observable<TranslationBundle | null> {
    return from(this.client.init());
  }

  use(code: string): void {
    void this.client.use(code);
  }

  /**
   * Translates a key, interpolating `{name}` placeholders.
   *
   * Resolution is catalogue → built-in English → the key itself. The catalogue wins whenever it
   * defines the key, so translation stays a database edit; the built-in table only covers keys the
   * catalogue has not been given yet. Without that middle step a feature shipped ahead of its
   * catalogue entry renders `blog.reader.textSize` on the page where a label belongs — the client
   * returns the key unchanged when it cannot resolve one.
   */
  t(key: string, params?: Record<string, string | number>): string {
    this.bundle();
    const translated = this.client.t(key, params);
    if (translated !== key) return translated;
    return fallbackString(key, params) ?? key;
  }

  /** Resolves a config entry that holds a translation key; a plain entry is returned as-is. */
  configText(key: string, fallback = ''): string {
    this.bundle();
    this.config.config();
    return this.client.configText(key, fallback);
  }

  /**
   * True when the catalogue actually defines `key`. Used where the UI would rather render nothing
   * than a placeholder — an optional tagline, say — instead of the built-in English.
   */
  has(key: string): boolean {
    this.bundle();
    return this.client.t(key) !== key;
  }

  formatDate(value: string | Date | null | undefined): string {
    this.bundle();
    return this.client.formatDate(value);
  }
}
