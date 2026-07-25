import { InjectionToken } from '@angular/core';

/**
 * Base URL of the Blog Admin API. Overridable at deploy time by setting
 * `window.__ADMIN_API_BASE__` before the app boots (e.g. in index.html), so the
 * same static build can target different backends without a rebuild.
 */
export const API_BASE = new InjectionToken<string>('API_BASE', {
  providedIn: 'root',
  factory: () =>
    (globalThis as any).__ADMIN_API_BASE__ ?? 'http://localhost:5080/api',
});
