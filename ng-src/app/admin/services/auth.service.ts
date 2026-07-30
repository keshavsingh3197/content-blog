import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ADMIN_APP_URL, IDP_BASE } from '../api.config';
import { EnrollStartResponse, Role, SsoSession, UserProfile } from '../admin.models';

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

  /** Exchange the shared SSO cookie for a fresh access token. 401 => not signed in. */
  refresh(): Observable<SsoSession> {
    return this.http
      .post<SsoSession>(`${this.idp}/sso/session`, {}, { withCredentials: true })
      .pipe(tap(session => this.setSession(session)));
  }

  /** The refresh token is an HttpOnly cookie we cannot read, so always attempt a silent session. */
  hasStoredSession(): boolean {
    return true;
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.idp}/sso/logout`, {}, { withCredentials: true })
      .pipe(tap({ next: () => this.clearSession(), error: () => this.clearSession() }));
  }

  /** Send the browser to the central IdP to sign in, returning to {@link returnTo} afterwards. */
  loginRedirect(returnTo: string = location.href): void {
    location.href = `${this.adminApp}/login?return=${encodeURIComponent(returnTo)}`;
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

  // ---- Self-service against the central IdP (bearer; the interceptor attaches the token) ----

  enrollStart(): Observable<EnrollStartResponse> {
    return this.http.post<EnrollStartResponse>(`${this.idp}/auth/2fa/enroll/start`, {});
  }

  enrollConfirm(code: string): Observable<{ backupCodes: string[] }> {
    return this.http.post<{ backupCodes: string[] }>(`${this.idp}/auth/2fa/enroll/confirm`, { code })
      .pipe(tap(() => this.patchUser({ twoFactorEnabled: true })));
  }

  disableTwoFactor(password: string): Observable<void> {
    return this.http.post<void>(`${this.idp}/auth/2fa/disable`, { password })
      .pipe(tap(() => this.patchUser({ twoFactorEnabled: false })));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.idp}/auth/change-password`, { currentPassword, newPassword })
      .pipe(tap(() => this.patchUser({ mustChangePassword: false })));
  }

  private patchUser(patch: Partial<UserProfile>): void {
    const u = this.user();
    if (u) this.user.set({ ...u, ...patch });
  }
}
