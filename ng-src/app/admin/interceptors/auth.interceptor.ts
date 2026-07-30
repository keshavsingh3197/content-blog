import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { API_BASE, IDP_BASE } from '../api.config';

/**
 * Attaches the bearer access token to calls to the resource API and the central IdP, and on a
 * single 401 tries one silent SSO refresh (exchanging the shared cookie) before replaying the
 * request. The /sso/session and /sso/logout endpoints are never refreshed, to avoid loops.
 * Any unrecoverable 401 fails closed: clear state and redirect to the IdP sign-in.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const base = inject(API_BASE);
  const idp = inject(IDP_BASE);

  const isApi = req.url.startsWith(base) || req.url.startsWith(idp);
  const isSessionRoute = req.url.includes('/sso/session') || req.url.includes('/sso/logout');

  const token = auth.token();
  const authed = isApi && token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || !isApi || isSessionRoute) {
        return throwError(() => err);
      }
      return auth.refresh().pipe(
        switchMap(session => next(req.clone({
          setHeaders: { Authorization: `Bearer ${session.accessToken}` },
        }))),
        catchError(refreshErr => {
          auth.forceClear();
          auth.loginRedirect();
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
