import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Observable, from } from 'rxjs';
import { PublicLocale, RuntimeConfig, RuntimeConfigClient } from '@keshavsingh3197/web-config';
import { IDP_BASE } from '../api.config';

/**
 * The key list and wire shapes live in `@keshavsingh3197/web-config`, shared with the admin app and the
 * portfolio so the three cannot drift. Re-exported here because this site's components import them
 * from this module.
 */
export { CONFIG_KEYS } from '@keshavsingh3197/web-config';
export type { ConfigKey, PublicLocale, RuntimeConfig } from '@keshavsingh3197/web-config';

/**
 * The Angular adapter over {@link RuntimeConfigClient} — the central runtime config served by the
 * identity provider (`GET /api/config`). Branding, icons, links, topic cards and feature flags are
 * database values an admin can change, not something compiled into this build.
 *
 * Read config through the accessors, never `config()!.values`: they handle the missing-key case and the
 * declared type. A `fallback` argument is only what to render before the API answers (or if it never
 * does) — the site stays usable either way, which is why nothing here throws.
 */
@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private readonly client = new RuntimeConfigClient({
    apiBase: inject(IDP_BASE),
    // The public site titles itself from the central config; the admin app titles per route instead.
    applyTitle: true,
  });

  readonly config = signal<RuntimeConfig | null>(null);
  readonly loaded = computed(() => this.config() !== null);
  readonly locales = computed<PublicLocale[]>(() => this.config()?.locales ?? []);

  constructor() {
    const off = this.client.onChange((value) => this.config.set(value));
    inject(DestroyRef).onDestroy(off);
  }

  load(): Observable<RuntimeConfig | null> {
    return from(this.client.load());
  }

  refresh(): void {
    this.load().subscribe();
  }

  // Each accessor reads the signal first, so templates re-render when the config arrives or changes.

  text(key: string, fallback = ''): string {
    this.config();
    return this.client.text(key, fallback);
  }

  bool(key: string, fallback = false): boolean {
    this.config();
    return this.client.bool(key, fallback);
  }

  num(key: string, fallback = 0): number {
    this.config();
    return this.client.num(key, fallback);
  }

  icon(key: string, fallback = ''): string {
    this.config();
    return this.client.icon(key, fallback);
  }

  /** A JSON config document (topic cards, footer link groups…), or the fallback if absent. */
  json<T>(key: string, fallback: T): T {
    this.config();
    return this.client.json(key, fallback);
  }

  isLocalized(key: string): boolean {
    this.config();
    return this.client.isLocalized(key);
  }

  /** The underlying client, for {@link I18nService} to share. */
  get runtime(): RuntimeConfigClient {
    return this.client;
  }
}
