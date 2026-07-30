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
 * Session gate for blog pages. Identity onboarding — changing a temporary password and enrolling
 * 2FA — is now handled centrally at the identity provider (admin.keshavsingh.in/security), so it
 * is no longer enforced (or proxied) here; the blog admin simply trusts the issued token.
 */
export const onboardingGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.user()) { auth.loginRedirect(); return false; }
  return true;
};
