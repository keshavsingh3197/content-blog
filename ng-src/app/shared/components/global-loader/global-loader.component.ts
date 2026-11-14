import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-global-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading.active()) {
      <div class="cb-top-progress" role="progressbar" aria-label="Loading">
        <div class="cb-top-progress-bar"></div>
      </div>
    }
    @if (loading.slow()) {
      <div class="cb-slow-banner" role="status" aria-live="polite">
        <span class="cb-slow-dot" aria-hidden="true"></span>
        <span>Waking up Content Blog…</span>
      </div>
    }
  `,
  styles: [`
    .cb-top-progress {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      z-index: 1400;
      pointer-events: none;
      overflow: hidden;
      background: rgba(99, 102, 241, 0.14);
    }
    .cb-top-progress-bar {
      position: absolute;
      inset: 0 auto 0 0;
      width: 42%;
      background: var(--gradient-primary, linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4));
      border-radius: 999px;
      animation: cbIndeterminate 1.25s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }
    .cb-slow-banner {
      position: fixed;
      top: calc(var(--navbar-height, 68px) + 10px);
      left: 50%;
      transform: translateX(-50%);
      z-index: 1399;
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.45rem 0.95rem;
      border-radius: 999px;
      border: 1px solid var(--border-strong, #d3d8e2);
      background: var(--surface-raised, #ffffff);
      color: var(--text-primary, #0f172a);
      box-shadow: var(--shadow-md, 0 6px 16px rgba(16, 24, 40, 0.12));
      font-size: 0.82rem;
      font-weight: 600;
      pointer-events: none;
      animation: cbBannerIn 180ms ease-out;
    }
    .cb-slow-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent, #6366f1);
      animation: cbPulse 1.1s ease-in-out infinite;
    }
    @keyframes cbIndeterminate {
      0% { transform: translateX(-110%); }
      55% { transform: translateX(135%); }
      100% { transform: translateX(260%); }
    }
    @keyframes cbBannerIn {
      from { opacity: 0; transform: translate(-50%, -6px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
    @keyframes cbPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.75); }
    }
  `],
})
export class GlobalLoaderComponent {
  readonly loading = inject(LoadingService);
}
