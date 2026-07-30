import { InjectionToken } from '@angular/core';

/**
 * Base URL of the Blog Admin RESOURCE API (content, media, links, users, settings).
 * Overridable at deploy time via `window.__ADMIN_API_BASE__` before the app boots.
 */
export const API_BASE = new InjectionToken<string>('API_BASE', {
  providedIn: 'root',
  factory: () =>
    (globalThis as any).__ADMIN_API_BASE__ ?? 'http://localhost:5080/api',
});

/**
 * Base URL of the central IDENTITY PROVIDER API (admin.keshavsingh.in). Sessions, token refresh
 * and account self-service are served from here — this app no longer authenticates users itself.
 * Overridable via `window.__IDP_API_BASE__`. Must be a keshavsingh.in subdomain so the shared SSO
 * cookie is sent (see the admin repo README).
 */
export const IDP_BASE = new InjectionToken<string>('IDP_BASE', {
  providedIn: 'root',
  factory: () =>
    (globalThis as any).__IDP_API_BASE__ ?? 'http://localhost:5000/api',
});

/**
 * Origin of the identity-provider SPA, used to redirect the browser for interactive sign-in.
 * Overridable via `window.__ADMIN_APP_URL__`.
 */
export const ADMIN_APP_URL = new InjectionToken<string>('ADMIN_APP_URL', {
  providedIn: 'root',
  factory: () =>
    (globalThis as any).__ADMIN_APP_URL__ ?? 'http://localhost:4200',
});
