import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminApiService } from '../services/admin-api.service';
import { AuthService } from '../services/auth.service';
import { ADMIN_APP_URL } from '../api.config';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  styleUrl: './dashboard.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="page-head">
      <div>
        <h1 class="page-title">Welcome back, {{ firstName() }} 👋</h1>
        <p class="page-sub">Here's an overview of your content platform.</p>
      </div>
      <a class="btn-primary" routerLink="/admin/content/new" *ngIf="canWrite()">
        <i class="fas fa-plus"></i> New topic
      </a>
    </section>

    <div class="stat-grid">
      <div class="stat-tile a">
        <span class="stat-ico"><i class="fas fa-file-lines"></i></span>
        <div><span class="stat-value">{{ contentError() ? '—' : contentCount() }}</span><span class="stat-name">Topics</span>
          <small class="muted stat-status" *ngIf="contentError()">unavailable</small></div>
      </div>
      <div class="stat-tile b">
        <span class="stat-ico"><i class="fas fa-circle-check"></i></span>
        <div><span class="stat-value">{{ contentError() ? '—' : publishedCount() }}</span><span class="stat-name">Published</span>
          <small class="muted stat-status" *ngIf="contentError()">unavailable</small></div>
      </div>
      <div class="stat-tile c">
        <span class="stat-ico"><i class="fas fa-images"></i></span>
        <div><span class="stat-value">{{ mediaError() ? '—' : mediaCount() }}</span><span class="stat-name">Media files</span>
          <small class="muted stat-status" *ngIf="mediaError()">unavailable</small></div>
      </div>
      <!--
        No "Users" tile. It used to render the row count of this app's own users collection, which
        no authentication path reads any more — a number that looked authoritative and was not.
        Accounts live at the identity provider; the quick action below links straight to them.
      -->
      <div class="stat-tile" [class.ok]="twoFa()" [class.warn]="!twoFa()">
        <span class="stat-ico"><i class="fas" [class.fa-lock]="twoFa()" [class.fa-lock-open]="!twoFa()"></i></span>
        <div>
          <span class="stat-value">{{ twoFa() ? 'On' : 'Off' }}</span>
          <span class="stat-name">Your 2FA</span>
        </div>
        <a *ngIf="!twoFa()" class="stat-cta" [href]="idpUrl + '/security'" target="_blank" rel="noopener">Enable</a>
      </div>
    </div>

    <!-- Architecture at a glance -->
    <div class="panel diagram-panel">
      <div class="panel-head"><i class="fas fa-diagram-project"></i> How it fits together</div>
      <div class="arch">
        <div class="arch-node ui">
          <i class="fas fa-window-maximize"></i>
          <strong>Angular Admin</strong>
          <small>this console</small>
        </div>
        <div class="arch-flow">
          <span class="arch-label">HTTPS · JWT</span>
          <div class="arch-line"><span class="arch-pulse"></span></div>
        </div>
        <div class="arch-node gate">
          <i class="fas fa-shield-halved"></i>
          <strong>Identity provider</strong>
          <small>sign-in · roles · 2FA</small>
        </div>
        <div class="arch-flow">
          <span class="arch-label">validated</span>
          <div class="arch-line"><span class="arch-pulse"></span></div>
        </div>
        <div class="arch-node api">
          <i class="fas fa-server"></i>
          <strong>.NET Web API</strong>
          <small>roles &amp; rules</small>
        </div>
        <div class="arch-flow">
          <span class="arch-label">Mongo driver</span>
          <div class="arch-line"><span class="arch-pulse"></span></div>
        </div>
        <div class="arch-node db">
          <i class="fas fa-database"></i>
          <strong>MongoDB</strong>
          <small>content · media · comments</small>
        </div>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="panel">
      <div class="panel-head"><i class="fas fa-bolt"></i> Quick actions</div>
      <div class="quick-grid">
        <a class="quick-card" routerLink="/admin/content">
          <span class="quick-ico q1"><i class="fas fa-file-lines"></i></span>
          <strong>Manage content</strong><small>Create, edit &amp; publish topics</small>
        </a>
        <a class="quick-card" routerLink="/admin/media">
          <span class="quick-ico q2"><i class="fas fa-cloud-arrow-up"></i></span>
          <strong>Upload media</strong><small>Images used by your posts</small>
        </a>
        <a class="quick-card" [href]="idpUrl + '/users'" target="_blank" rel="noopener" *ngIf="isAdmin()">
          <span class="quick-ico q3"><i class="fas fa-user-plus"></i></span>
          <strong>Users &amp; roles</strong><small>Managed at the identity provider</small>
        </a>
        <a class="quick-card" [href]="idpUrl + '/security'" target="_blank" rel="noopener">
          <span class="quick-ico q4"><i class="fas fa-key"></i></span>
          <strong>Security &amp; 2FA</strong><small>Authenticator &amp; backup codes</small>
        </a>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(AdminApiService);
  private auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  contentCount = signal(0);
  publishedCount = signal(0);
  mediaCount = signal(0);

  /** A source that failed to load reads as unavailable rather than a plausible 0. */
  readonly contentError = signal(false);
  readonly mediaError = signal(false);

  /**
   * Central identity provider — users, roles, security/2FA and settings are managed there.
   * Injected, so a local console does not link a developer to production.
   */
  readonly idpUrl = inject(ADMIN_APP_URL);

  firstName = computed(() => (this.auth.user()?.displayName ?? '').split(' ')[0] || 'there');
  isAdmin = computed(() => this.auth.hasRole('Admin'));
  canWrite = computed(() => this.auth.hasRole('Admin', 'Editor'));
  twoFa = computed(() => !!this.auth.user()?.twoFactorEnabled);

  ngOnInit(): void {
    forkJoin({
      content: this.api.listContent().pipe(catchError(() => {
        this.contentError.set(true);
        return of([]);
      })),
      media: this.api.listMedia().pipe(catchError(() => {
        this.mediaError.set(true);
        return of([]);
      })),
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ content, media }) => {
        this.contentCount.set(content.length);
        this.publishedCount.set(content.filter(c => c.published).length);
        this.mediaCount.set(media.length);
      });
  }
}
