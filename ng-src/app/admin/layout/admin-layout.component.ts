import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../services/toast.service';
import { ToastHostComponent } from '../components/toast-host.component';
import { ADMIN_APP_URL } from '../api.config';

interface NavLink {
  label: string;
  icon: string;
  path: string;
  exact: boolean;
  roles?: ('Admin' | 'Editor' | 'Viewer')[];
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The admin stylesheet rides this component so it is bundled into the lazy /admin
  // chunk instead of the public global bundle. Encapsulation is None because the rules
  // target the whole console (child routes, dialogs, toasts), not just this template.
  styleUrl: '../admin.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, RouterModule, ToastHostComponent],
  template: `
    <div class="admin-shell">
      <aside class="admin-sidebar" [class.open]="menuOpen">
        <div class="admin-brand">
          <span class="admin-brand-mark"><i class="fas fa-shield-halved"></i></span>
          <span class="admin-brand-text">Admin<span>Console</span></span>
        </div>

        <nav class="admin-nav">
          <ng-container *ngFor="let link of visibleLinks()">
            <a class="admin-nav-link"
               [routerLink]="link.path"
               [routerLinkActive]="'active'"
               [routerLinkActiveOptions]="{ exact: link.exact }"
               (click)="menuOpen = false">
              <i class="fas" [ngClass]="link.icon"></i>
              <span>{{ link.label }}</span>
              <span class="admin-nav-dot"></span>
            </a>
          </ng-container>
        </nav>

        <a class="admin-nav-link" [href]="idpUrl" target="_blank" rel="noopener">
          <i class="fas fa-user-shield"></i>
          <span>Identity &amp; account</span>
          <i class="fas fa-arrow-up-right-from-square" style="margin-left:auto;font-size:0.75em;opacity:0.6"></i>
        </a>

        <div class="admin-sidebar-foot">
          <div class="admin-user-chip">
            <span class="admin-avatar">{{ initials() }}</span>
            <span class="admin-user-meta">
              <strong>{{ user()?.displayName }}</strong>
              <small>{{ topRole() }}</small>
            </span>
          </div>
          <button class="admin-logout" (click)="logout()">
            <i class="fas fa-arrow-right-from-bracket"></i> Sign out
          </button>
        </div>
      </aside>

      <div class="admin-main">
        <header class="admin-topbar">
          <button class="admin-burger" (click)="menuOpen = !menuOpen" aria-label="Toggle menu">
            <i class="fas fa-bars"></i>
          </button>
          <div class="admin-topbar-spacer"></div>
          <a class="admin-topbar-btn" routerLink="/" title="View site">
            <i class="fas fa-arrow-up-right-from-square"></i>
          </a>
          <button class="admin-topbar-btn" (click)="theme.toggle()" aria-label="Toggle theme">
            <i class="fas" [class.fa-sun]="theme.theme() === 'dark'" [class.fa-moon]="theme.theme() === 'light'"></i>
          </button>
          <div class="admin-topbar-user">
            <span class="admin-avatar sm">{{ initials() }}</span>
          </div>
        </header>

        <main class="admin-content">
          <router-outlet></router-outlet>
        </main>
      </div>

      <div class="admin-backdrop" [class.show]="menuOpen" (click)="menuOpen = false"></div>
    </div>

    <app-toast-host></app-toast-host>
  `,
})
export class AdminLayoutComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  theme = inject(ThemeService);

  menuOpen = false;
  user = this.auth.user;

  // Users & roles, security/2FA and settings live at the central identity provider
  // (admin.keshavsingh.in) — see the "Identity & account" link in the sidebar foot.
  private links: NavLink[] = [
    { label: 'Dashboard', icon: 'fa-gauge-high', path: '/admin', exact: true },
    { label: 'Content / Docs', icon: 'fa-file-lines', path: '/admin/content', exact: false },
    { label: 'Media', icon: 'fa-images', path: '/admin/media', exact: false },
    { label: 'Links', icon: 'fa-link', path: '/admin/links', exact: false },
    { label: 'Comments', icon: 'fa-comments', path: '/admin/comments', exact: false, roles: ['Admin'] },
  ];

  /**
   * The central identity provider where account, 2FA, users and settings are managed. Injected
   * rather than hardcoded so a local console links to a local IdP — `window.__ADMIN_APP_URL__`
   * carries the deployed value.
   */
  readonly idpUrl = inject(ADMIN_APP_URL);

  visibleLinks = computed(() => {
    const u = this.user();
    return this.links.filter(l => !l.roles || (u && l.roles.some(r => u.roles.includes(r))));
  });

  initials = computed(() => {
    const name = this.user()?.displayName ?? '?';
    return name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
  });

  // Roles arrive in insertion order, so ['Editor','Admin'] would otherwise label an admin
  // "Editor". Show the most privileged one the user actually holds.
  private static readonly RolePrecedence = ['Admin', 'Editor', 'Viewer'] as const;

  topRole = computed(() => {
    const roles = this.user()?.roles ?? [];
    return AdminLayoutComponent.RolePrecedence.find(r => roles.includes(r)) ?? 'Viewer';
  });

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.done(),
      error: () => this.done(),
    });
  }

  private done(): void {
    this.toast.info('Signed out.');
    // Not /admin/login: that component immediately redirects to the identity provider, so there
    // would be no signed-out resting state — you could not log out and stay on the site.
    this.router.navigate(['/']);
  }
}
