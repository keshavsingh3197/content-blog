import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import { Subscription } from 'rxjs';

const SLOW_THRESHOLD_MS = 2200;

/**
 * Tracks active API requests and Angular route transitions to drive the global
 * top progress bar and a delayed wakeup pill on cold-start requests.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService implements OnDestroy {
  private readonly router = inject(Router);
  private readonly httpPending = signal(0);
  private readonly routePending = signal(false);
  private slowTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly routerSub: Subscription;

  readonly active = computed(() => this.httpPending() > 0 || this.routePending());
  readonly slow = signal(false);

  constructor() {
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.routePending.set(true);
        this.syncTimer();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.routePending.set(false);
        this.syncTimer();
      }
    });
  }

  beginHttp(): () => void {
    let settled = false;
    this.httpPending.update(n => n + 1);
    this.syncTimer();
    return () => {
      if (settled) return;
      settled = true;
      this.httpPending.update(n => Math.max(0, n - 1));
      this.syncTimer();
    };
  }

  ngOnDestroy(): void {
    this.routerSub.unsubscribe();
    this.clearTimer();
  }

  private syncTimer(): void {
    if (this.active()) {
      if (!this.slowTimer && !this.slow()) {
        this.slowTimer = setTimeout(() => {
          this.slowTimer = null;
          if (this.active()) {
            this.slow.set(true);
          }
        }, SLOW_THRESHOLD_MS);
      }
    } else {
      this.clearTimer();
      if (this.slow()) {
        this.slow.set(false);
      }
    }
  }

  private clearTimer(): void {
    if (this.slowTimer) {
      clearTimeout(this.slowTimer);
      this.slowTimer = null;
    }
  }
}
