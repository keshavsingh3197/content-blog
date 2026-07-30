import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Role } from '../admin.models';

/**
 * Blocks a route unless a session is active; tries a silent SSO exchange of the shared cookie
 * first, so a user already signed in at the identity provider lands here without a second login.
 * Failure redirects the browser to the central IdP sign-in.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);

  if (auth.isAuthenticated()) return of(true);

  return auth.refresh().pipe(
    map(() => true),
    catchError(() => {
      auth.forceClear();
      auth.loginRedirect();
      return of(false);
    })
  );
};

/** Default-deny role gate. Redirects authenticated-but-unauthorised users to the dashboard. */
export const roleGuard = (...roles: Role[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.hasRole(...roles) ? true : router.createUrlTree(['/admin']);
};

/**
 * Onboarding gate: a user with a temporary password must change it first, and a user without 2FA
 * must enrol before doing anything else. These flows are proxied to the central IdP. The
 * change-password and security pages are intentionally left ungated as the redirect targets.
 */
export const onboardingGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();
  if (!user) { auth.loginRedirect(); return false; }
  if (user.mustChangePassword) return router.createUrlTree(['/admin/account/password']);
  if (!user.twoFactorEnabled) return router.createUrlTree(['/admin/security']);
  return true;
};
