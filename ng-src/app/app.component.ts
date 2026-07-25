import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { ReadingProgressComponent } from './components/reading-progress/reading-progress.component';
import { ThemeService } from './services/theme.service';

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

  constructor(private themeService: ThemeService, private router: Router) {
    this.isAdmin.set(this.router.url.startsWith('/admin'));
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.isAdmin.set(e.urlAfterRedirects.startsWith('/admin')));
  }
}
