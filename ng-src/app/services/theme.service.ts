import { Injectable, signal, effect } from '@angular/core';

/** The remembered light/dark preference. */
const STORAGE_KEY = 'theme';

/**
 * Where a browser blocks site data — Safari private browsing, Firefox strict mode, an enterprise
 * policy — touching `localStorage` throws on the accessor itself, not on the call. This service is
 * `providedIn: 'root'` and injected during bootstrap, so an unguarded read would take the whole
 * site down (blog and console alike) over a cosmetic preference. Both directions fail quietly and
 * the theme falls back to light.
 */
function readStoredTheme(): 'light' | 'dark' {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function writeStoredTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Preference is not persistable in this browser; the session still themes correctly.
  }
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<'light' | 'dark'>(readStoredTheme());

  constructor() {
    effect(() => {
      const t = this.theme();
      document.documentElement.setAttribute('data-theme', t);
      writeStoredTheme(t);
    });
    document.documentElement.setAttribute('data-theme', this.theme());
  }

  toggle(): void {
    this.theme.update(t => (t === 'light' ? 'dark' : 'light'));
  }
}
