import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { IDP_BASE } from '../api.config';

interface TrackVisitRequest {
  websiteKey: string;
  path?: string;
  referrer?: string;
}

/**
 * Sends lightweight page-view events to the central admin analytics API.
 * Failures are intentionally ignored to avoid impacting navigation.
 */
@Injectable({ providedIn: 'root' })
export class VisitTrackingService {
  constructor(private http: HttpClient, @Inject(IDP_BASE) private idpBase: string) {}

  track(websiteKey: string, path: string): void {
    const body: TrackVisitRequest = {
      websiteKey,
      path,
      referrer: document.referrer || undefined,
    };

    this.http.post<void>(`${this.idpBase}/analytics/visit`, body).subscribe({
      error: () => {
        // Analytics must never break browsing; swallow transport/server errors.
      },
    });
  }
}
