import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_BASE } from '../admin/api.config';

export interface PageStat {
  path: string;
  views: number;
}

/**
 * The public per-page read counter, served by the blog's own resource API.
 *
 * Distinct from {@link VisitTrackingService}, which reports navigation to the identity provider's
 * private analytics: this one is the number shown to the reader. The server counts a visitor once
 * per page per window, so calling {@link track} on every visit does not inflate it — and the browser
 * is not trusted to decide that.
 *
 * Every call fails soft. A page must render its content whether or not the API is reachable.
 */
@Injectable({ providedIn: 'root' })
export class PageStatsService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_BASE);

  /** Record a read and return the new total. Null when the API is unavailable. */
  track(path: string): Observable<PageStat | null> {
    return this.http
      .post<PageStat>(`${this.api}/page-stats/view`, { path })
      .pipe(catchError(() => of(null)));
  }

  /** The current total without recording a read. */
  get(path: string): Observable<PageStat | null> {
    return this.http
      .get<PageStat>(`${this.api}/page-stats`, { params: { path } })
      .pipe(catchError(() => of(null)));
  }
}
