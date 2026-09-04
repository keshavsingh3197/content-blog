import { Injectable, signal } from '@angular/core';

/**
 * Open/close state for the global search overlay.
 *
 * The overlay is rendered once, by `AppComponent`, but opened from several places — the navbar
 * button, the home hero's search field, the empty-state links on the 404 and reading-list pages,
 * and the ⌘K/`/` shortcut. A signal in a root service is what lets all of those reach the single
 * instance without any of them importing the component.
 */
@Injectable({ providedIn: 'root' })
export class SearchOverlayService {
  readonly isOpen = signal(false);

  /** Text to seed the field with — how the hero field hands over what the reader already typed. */
  readonly seed = signal('');

  open(seed = ''): void {
    this.seed.set(seed);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    if (this.isOpen()) this.close();
    else this.open();
  }
}
