import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { API_BASE } from '../api.config';

/**
 * Attaches the bearer token to API calls and transparently refreshes it once on a
 * 401. Auth endpoints (login / refresh / verify) are never retried to avoid loops.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const base = inject(API_BASE);

  const isApi = req.url.startsWith(base);
  const isAuthRoute = req.url.includes('/auth/login')
    || req.url.includes('/auth/refresh')
    || req.url.includes('/auth/2fa/verify')
    || req.url.includes('/auth/2fa/email/send');

  const token = auth.token();
  const authed = isApi && token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || !isApi || isAuthRoute || !auth.hasStoredSession()) {
        return throwError(() => err);
      }
      // One refresh attempt, then replay the original request with the new token.
      return auth.refresh().pipe(
        switchMap(tokens => next(req.clone({
          setHeaders: { Authorization: `Bearer ${tokens.accessToken}` },
        }))),
        catchError(refreshErr => {
          auth.forceClear();
          router.navigate(['/admin/login']);
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
