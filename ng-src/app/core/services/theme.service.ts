import { Injectable, computed, effect, signal } from '@angular/core';

/** The remembered appearance preference. */
const STORAGE_KEY = 'theme';

/** What the reader chose. `system` defers to the operating system and keeps following it. */
export type ThemePreference = 'light' | 'dark' | 'system';

/** What is actually painted. `system` resolves to one of these. */
export type ResolvedTheme = 'light' | 'dark';

/** The browser-chrome colour for each palette, kept in step with `--bg-app` in `_tokens.scss`. */
const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: '#f6f7f9',
  dark: '#0b0f17',
};

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Where a browser blocks site data — Safari private browsing, Firefox strict mode, an enterprise
 * policy — touching `localStorage` throws on the accessor itself, not on the call. This service is
 * `providedIn: 'root'` and injected during bootstrap, so an unguarded read would take the whole
 * site down (blog and console alike) over a cosmetic preference. Both directions fail quietly.
 *
 * The default is `system`, not `light`: a reader whose device is in dark mode should not be handed
 * a white page on their first visit just because they have never touched the toggle.
 */
function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function writeStoredPreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Preference is not persistable in this browser; the session still themes correctly.
  }
}

/** The OS preference, or `light` where the query is unsupported (very old browsers, jsdom). */
function readSystemTheme(): ResolvedTheme {
  try {
    return window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** What the reader picked — including `system`, which is a real choice and not an absence of one. */
  readonly preference = signal<ThemePreference>(readStoredPreference());

  /** The OS setting, kept live: a reader on `system` follows their device's sunset schedule. */
  private readonly systemTheme = signal<ResolvedTheme>(readSystemTheme());

  /**
   * The palette actually in force. Everything that reacts to appearance — the Mermaid renderer, the
   * toggle icon — must read this rather than {@link preference}, or `system` is treated as light.
   */
  readonly theme = computed<ResolvedTheme>(() => {
    const preference = this.preference();
    return preference === 'system' ? this.systemTheme() : preference;
  });

  constructor() {
    // Keep following the OS while the preference is `system`. The listener is registered
    // unconditionally: the reader can switch back to `system` at any point, and re-subscribing on
    // every preference change would drop OS changes that land in between.
    try {
      const query = window.matchMedia?.(DARK_QUERY);
      query?.addEventListener?.('change', event => this.systemTheme.set(event.matches ? 'dark' : 'light'));
    } catch {
      // No matchMedia: `system` stays on the light default, which is what readSystemTheme() returned.
    }

    effect(() => {
      const resolved = this.theme();
      document.documentElement.setAttribute('data-theme', resolved);
      // `color-scheme` is what makes native widgets — form controls, the scrollbar gutter, the
      // canvas behind an overscroll — follow the palette. Without it a dark page keeps white
      // scrollbars and a white flash when the reader overscrolls.
      document.documentElement.style.colorScheme = resolved;
      this.applyThemeColor(resolved);
      writeStoredPreference(this.preference());
    });

    // Paint before the first effect flush so there is no light frame on a dark-theme load.
    document.documentElement.setAttribute('data-theme', this.theme());
    document.documentElement.style.colorScheme = this.theme();
  }

  /** Set the preference explicitly. This is what the theme menu calls. */
  set(preference: ThemePreference): void {
    this.preference.set(preference);
  }

  /**
   * Flip between the two concrete palettes, resolving `system` to whatever it is currently
   * showing. Kept as the one-gesture path for anywhere that wants a plain toggle rather than the
   * navbar's three-way menu.
   */
  toggle(): void {
    this.preference.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  /**
   * Repaint the browser chrome (Android address bar, iOS status bar, PWA splash). `index.html`
   * ships one static `theme-color`, which is wrong for whichever palette it does not describe.
   */
  private applyThemeColor(resolved: ResolvedTheme): void {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = THEME_COLOR[resolved];
  }
}
