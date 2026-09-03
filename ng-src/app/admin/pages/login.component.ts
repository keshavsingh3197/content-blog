import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

/**
 * Sign-in is centralized at the identity provider (admin.keshavsingh.in). This route no longer
 * renders a form — it immediately hands the browser to the IdP and returns to the console
 * afterwards. Deep links that hit a guard are redirected the same way, with their own return URL.
 */
@Component({
  selector: 'app-admin-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sso-redirect">
      <i class="fas fa-shield-halved"></i>
      <p>Redirecting to sign in…</p>
    </div>
  `,
  styles: [`
    .sso-redirect {
      min-height: 60vh; display: flex; flex-direction: column; gap: 0.75rem;
      align-items: center; justify-content: center; color: var(--admin-muted, #8a8f98);
    }
    .sso-redirect i { font-size: 1.75rem; }
  `],
})
export class LoginComponent {
  private auth = inject(AuthService);

  constructor() {
    // Return to the console root after a successful sign-in (hash route on GitHub Pages).
    this.auth.loginRedirect(`${location.origin}/#/admin`);
  }
}
