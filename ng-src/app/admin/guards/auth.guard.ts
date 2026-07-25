import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Role } from '../admin.models';

/** Blocks a route unless a session is active; tries a silent refresh first. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return of(true);
  if (!auth.hasStoredSession()) return of(router.createUrlTree(['/admin/login']));

  return auth.refresh().pipe(
    map(() => true),
    catchError(() => {
      auth.forceClear();
      return of(router.createUrlTree(['/admin/login']));
    })
  );
};

/** Default-deny role gate. Redirects authenticated-but-unauthorised users to the dashboard. */
export const roleGuard = (...roles: Role[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.hasRole(...roles) ? true : router.createUrlTree(['/admin']);
};
