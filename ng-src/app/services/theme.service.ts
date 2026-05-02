import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  constructor() {
    effect(() => {
      const t = this.theme();
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('theme', t);
    });
    document.documentElement.setAttribute('data-theme', this.theme());
  }

  toggle(): void {
    this.theme.update(t => (t === 'light' ? 'dark' : 'light'));
  }
}
