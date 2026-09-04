import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NavbarComponent } from './layout/navbar/navbar.component';
import { FooterComponent } from './layout/footer/footer.component';
import { ReadingProgressComponent } from './layout/reading-progress/reading-progress.component';
import { BackToTopComponent } from './layout/back-to-top/back-to-top.component';
import { CommandPaletteComponent } from './layout/command-palette/command-palette.component';
import { ThemeService } from './core/services/theme.service';
import { VisitTrackingService } from './core/services/visit-tracking.service';
import { RuntimeConfigService } from './core/services/runtime-config.service';
import { I18nService } from './core/services/i18n.service';
import { AuthService } from './core/services/auth.service';
import { ReaderPrefsService } from './core/services/reader-prefs.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, NavbarComponent, FooterComponent,
    ReadingProgressComponent, BackToTopComponent, CommandPaletteComponent,
  ],
  template: `
    <!-- The admin console renders its own full-screen chrome, so the public
         blog navbar/footer are hidden on /admin routes. -->
    <ng-container *ngIf="!isAdmin()">
      <!-- First focusable element on the page: a keyboard reader can step over the whole header
           and the topic strip instead of tabbing through them on every navigation. -->
      <a class="skip-link" href="#main-content" (click)="focusMain($event)">
        {{ i18n.t('blog.nav.skipToContent') }}
      </a>
      <app-reading-progress></app-reading-progress>
      <app-navbar></app-navbar>
    </ng-container>

    <main
      id="main-content"
      tabindex="-1"
      [class.admin-main-shell]="isAdmin()"
      [class.route-enter-a]="!isAdmin() && routeKey() % 2 === 0"
      [class.route-enter-b]="!isAdmin() && routeKey() % 2 === 1"
    >
      <router-outlet></router-outlet>
    </main>

    <ng-container *ngIf="!isAdmin()">
      <app-footer></app-footer>
      <app-back-to-top></app-back-to-top>
      <app-command-palette></app-command-palette>
    </ng-container>
  `
})
export class AppComponent {
  readonly isAdmin = signal(false);
  /**
   * Navigation counter, used only for its parity.
   *
   * `<main>` is not replaced on navigation, and a CSS animation does not replay just because an
   * attribute changed — it replays when the *animation name* changes. So the enter animation is
   * declared twice under different names and the two classes alternate, which is what actually
   * restarts it. (An earlier attempt bound a `data-route` attribute and animated once, on load.)
   */
  readonly routeKey = signal(0);

  protected readonly i18n = inject(I18nService);

  private lastTrackedUrl = '';

  constructor(
    private themeService: ThemeService,
    private router: Router,
    private visitTracking: VisitTrackingService,
    private config: RuntimeConfigService,
    private auth: AuthService,
    // Injected for its constructor effect: it applies the reader's stored text size and measure to
    // the document root, and nothing else references it until the article view renders.
    private readerPrefs: ReaderPrefsService
  ) {
    // Central config first (it carries the language-persistence key and the poll interval), then the
    // strings. Both fail soft: if the API is unreachable the site still renders, using the built-in
    // fallbacks rather than showing nothing.
    this.config.load().subscribe(() => this.i18n.init().subscribe());

    // Try the shared SSO cookie once at boot, so a reader who is already signed in elsewhere on
    // keshavsingh.in can comment without a round trip through the identity provider. A 401 here is
    // the ordinary case — most visitors are signed out — so it is swallowed, not surfaced.
    this.auth.refresh().subscribe({ error: () => {} });

    this.isAdmin.set(this.router.url.startsWith('/admin'));
    this.trackVisit(this.router.url);

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => {
        this.isAdmin.set(e.urlAfterRedirects.startsWith('/admin'));
        this.routeKey.update(n => n + 1);
        this.trackVisit(e.urlAfterRedirects);
      });
  }

  /**
   * Move focus, not just the scroll position. A bare `#main-content` href scrolls but leaves focus
   * on the link, so the next Tab goes back into the header the reader just skipped.
   */
  focusMain(event: Event): void {
    event.preventDefault();
    const main = document.getElementById('main-content');
    main?.focus();
    main?.scrollIntoView({ block: 'start' });
  }

  private trackVisit(url: string): void {
    if (!url || this.lastTrackedUrl === url) return;
    this.lastTrackedUrl = url;

    const normalized = url.startsWith('/') ? url : `/${url}`;
    const websiteKey = normalized.startsWith('/admin') ? 'blog-admin' : 'blog';
    this.visitTracking.track(websiteKey, normalized);
  }
}
