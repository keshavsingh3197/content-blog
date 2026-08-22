import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { ReadingProgressComponent } from './components/reading-progress/reading-progress.component';
import { ThemeService } from './services/theme.service';
import { VisitTrackingService } from './services/visit-tracking.service';
import { RuntimeConfigService } from './services/runtime-config.service';
import { I18nService } from './services/i18n.service';
import { AuthService } from './admin/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent, ReadingProgressComponent],
  template: `
    <!-- The admin console renders its own full-screen chrome, so the public
         blog navbar/footer are hidden on /admin routes. -->
    <ng-container *ngIf="!isAdmin()">
      <app-reading-progress></app-reading-progress>
      <app-navbar></app-navbar>
    </ng-container>

    <main [class.admin-main-shell]="isAdmin()">
      <router-outlet></router-outlet>
    </main>

    <app-footer *ngIf="!isAdmin()"></app-footer>
  `
})
export class AppComponent {
  readonly isAdmin = signal(false);
  private lastTrackedUrl = '';

  constructor(
    private themeService: ThemeService,
    private router: Router,
    private visitTracking: VisitTrackingService,
    private config: RuntimeConfigService,
    private i18n: I18nService,
    private auth: AuthService
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
        this.trackVisit(e.urlAfterRedirects);
      });
  }

  private trackVisit(url: string): void {
    if (!url || this.lastTrackedUrl === url) return;
    this.lastTrackedUrl = url;

    const normalized = url.startsWith('/') ? url : `/${url}`;
    const websiteKey = normalized.startsWith('/admin') ? 'blog-admin' : 'blog';
    this.visitTracking.track(websiteKey, normalized);
  }
}
