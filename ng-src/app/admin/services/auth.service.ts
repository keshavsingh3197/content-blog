import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE } from '../api.config';
import {
  AuthTokens, EnrollStartResponse, LoginResponse, Role,
  TwoFactorMethod, UserProfile,
} from '../admin.models';

const REFRESH_KEY = 'admin.refresh';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = inject(API_BASE);

  /** Access token is kept in memory only (not localStorage) to limit XSS exposure. */
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

  // ---- Login flow ----

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/auth/login`, { email, password }).pipe(
      tap(res => { if (res.tokens) this.setSession(res.tokens); })
    );
  }

  verifyTwoFactor(twoFactorToken: string, code: string, method: TwoFactorMethod): Observable<AuthTokens> {
    return this.http
      .post<AuthTokens>(`${this.base}/auth/2fa/verify`, { twoFactorToken, code, method })
      .pipe(tap(tokens => this.setSession(tokens)));
  }

  sendEmailOtp(twoFactorToken: string): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/2fa/email/send`, { twoFactorToken });
  }

  // ---- Session ----

  private setSession(tokens: AuthTokens): void {
    this.accessToken.set(tokens.accessToken);
    this.user.set(tokens.user);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  }

  private clearSession(): void {
    this.accessToken.set(null);
    this.user.set(null);
    localStorage.removeItem(REFRESH_KEY);
  }

  /** Restore a session on app start / after a 401 using the stored refresh token. */
  refresh(): Observable<AuthTokens> {
    const refreshToken = localStorage.getItem(REFRESH_KEY) ?? '';
    return this.http
      .post<AuthTokens>(`${this.base}/auth/refresh`, { refreshToken })
      .pipe(tap(tokens => this.setSession(tokens)));
  }

  hasStoredSession(): boolean {
    return !!localStorage.getItem(REFRESH_KEY);
  }

  logout(): Observable<void> {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const req = this.http.post<void>(`${this.base}/auth/logout`, { refreshToken });
    return req.pipe(tap({ next: () => this.clearSession(), error: () => this.clearSession() }));
  }

  forceClear(): void {
    this.clearSession();
  }

  // ---- Self-service 2FA enrollment ----

  enrollStart(): Observable<EnrollStartResponse> {
    return this.http.post<EnrollStartResponse>(`${this.base}/auth/2fa/enroll/start`, {});
  }

  enrollConfirm(code: string): Observable<{ backupCodes: string[] }> {
    return this.http.post<{ backupCodes: string[] }>(`${this.base}/auth/2fa/enroll/confirm`, { code })
      .pipe(tap(() => this.patchUser({ twoFactorEnabled: true })));
  }

  disableTwoFactor(password: string): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/2fa/disable`, { password })
      .pipe(tap(() => this.patchUser({ twoFactorEnabled: false })));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/change-password`, { currentPassword, newPassword })
      .pipe(tap(() => this.patchUser({ mustChangePassword: false })));
  }

  private patchUser(patch: Partial<UserProfile>): void {
    const u = this.user();
    if (u) this.user.set({ ...u, ...patch });
  }
}
