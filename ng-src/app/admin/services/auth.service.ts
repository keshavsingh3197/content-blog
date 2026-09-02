import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, shareReplay } from 'rxjs';
import { ADMIN_APP_URL, IDP_BASE } from '../api.config';
import { Role, SsoSession, UserProfile } from '../admin.models';

/**
 * Auth client for the blog admin console. This app is an SSO CONSUMER: it does not authenticate
 * users itself. Sessions come from the central identity provider (admin.keshavsingh.in) via the
 * shared HttpOnly cookie — {@link refresh} silently exchanges that cookie for a short-lived access
 * token (kept in memory only). Interactive sign-in happens by redirecting to the IdP.
 *
 * Account self-service (2FA enrolment, password change) is proxied to the IdP with the bearer
 * token, so those pages continue to work against the single identity source.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private idp = inject(IDP_BASE);
  private adminApp = inject(ADMIN_APP_URL);

  /** Access token in memory only (not localStorage) to limit XSS exposure. */
  private accessToken = signal<string | null>(null);
  readonly user = signal<UserProfile | null>(null);

  readonly isAuthenticated = computed(() => !!this.user() && !!this.accessToken());

  token(): string | null {
    return this.accessToken();
  }

  hasRole(...roles: Role[]): boolean {
    const u = this.user();
    return !!u && roles.some(r => u.roles.includes(r));
  }

  // ---- Session (silent SSO) ----

  /** Replay the most recent (in-flight or completed) exchange so concurrent callers share it. */
  private readonly sharedRefresh: Observable<SsoSession> = this.http
    .post<SsoSession>(`${this.idp}/sso/session`, {}, { withCredentials: true })
    .pipe(
      tap(session => this.setSession(session)),
      shareReplay({ bufferSize: 1, refCount: true })
    );

  /** Exchange the shared SSO cookie for a fresh access token. 401 => not signed in.
   *  Single-flight: concurrent callers (e.g. several 401s at once in the interceptor) share one
   *  /sso/session request via the replay above, instead of racing and clobbering each other's token. */
  refresh(): Observable<SsoSession> {
    return this.sharedRefresh;
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.idp}/sso/logout`, {}, { withCredentials: true })
      .pipe(tap({ next: () => this.clearSession(), error: () => this.clearSession() }));
  }

  /** Send the browser to the central IdP to sign in, returning to {@link returnTo} afterwards.
   *  `app=content-blog` scopes single-session enforcement to this site only — signing in here
   *  never prompts to remove a session on admin or ghar-ledger, and vice versa. */
  loginRedirect(returnTo: string = location.href): void {
    location.href = `${this.adminApp}/login?return=${encodeURIComponent(returnTo)}&app=content-blog`;
  }

  forceClear(): void {
    this.clearSession();
  }

  private setSession(session: SsoSession): void {
    this.accessToken.set(session.accessToken);
    this.user.set(session.user);
  }

  private clearSession(): void {
    this.accessToken.set(null);
    this.user.set(null);
  }

  // No 2FA-enrollment or change-password calls here: those are pages of the identity provider's
  // own console, which this app links out to rather than proxying.
}
