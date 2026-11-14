import { HttpContext, HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

export const SILENT_HTTP = new HttpContextToken<boolean>(() => false);

/** Opt a background HTTP request out of the global top progress bar / wakeup banner. */
export function silentHttpContext(): HttpContext {
  return new HttpContext().set(SILENT_HTTP, true);
}

const SILENT_URL_RE = /\/assets\/|\/analytics\/visit|\/page-stats|\/sso\/session/;

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SILENT_HTTP) || SILENT_URL_RE.test(req.url)) {
    return next(req);
  }
  const done = inject(LoadingService).beginHttp();
  return next(req).pipe(finalize(done));
};
