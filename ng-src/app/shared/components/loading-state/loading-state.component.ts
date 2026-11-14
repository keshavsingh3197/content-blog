import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (variant() === 'cards') {
      <div class="cb-skel-cards" role="status" [attr.aria-label]="message()">
        @for (item of items(); track item) {
          <div class="cb-skel-card">
            <div class="cb-skel cb-skel-title"></div>
            <div class="cb-skel cb-skel-line"></div>
            <div class="cb-skel cb-skel-line short"></div>
          </div>
        }
      </div>
    } @else if (variant() === 'spinner') {
      <div class="cb-loading-spinner" role="status" aria-live="polite">
        <span class="cb-spinner" aria-hidden="true"></span>
        <span>{{ message() }}</span>
      </div>
    } @else {
      <div class="cb-skel-rows" role="status" [attr.aria-label]="message()">
        @for (item of items(); track item) {
          <div class="cb-skel-row">
            <div class="cb-skel cb-skel-row-main"></div>
            <div class="cb-skel cb-skel-row-meta"></div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .cb-skel-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      gap: 1rem;
      padding: 0.25rem 0;
    }
    .cb-skel-card {
      padding: 1.1rem;
      border-radius: var(--radius, 14px);
      border: 1px solid var(--border-color, #e6e8ee);
      background: var(--bg-primary, #ffffff);
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .cb-skel-rows {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      padding: 0.5rem 0;
    }
    .cb-skel-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.85rem 1rem;
      border-radius: var(--radius-sm, 10px);
      border: 1px solid var(--border-color, #e6e8ee);
      background: var(--bg-primary, #ffffff);
    }
    .cb-skel {
      background: linear-gradient(
        90deg,
        var(--bg-secondary, #f2f4f7) 25%,
        var(--bg-tertiary, #e8ebf0) 50%,
        var(--bg-secondary, #f2f4f7) 75%
      );
      background-size: 200% 100%;
      border-radius: 6px;
      animation: cbSkelShimmer 1.4s ease-in-out infinite;
    }
    .cb-skel-title { height: 1rem; width: 58%; }
    .cb-skel-line { height: 0.78rem; width: 92%; }
    .cb-skel-line.short { width: 45%; }
    .cb-skel-row-main { height: 0.9rem; width: 62%; }
    .cb-skel-row-meta { height: 0.9rem; width: 18%; }
    .cb-loading-spinner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.7rem;
      padding: 2rem 1rem;
      color: var(--text-secondary, #556070);
      font-size: 0.9rem;
      font-weight: 500;
    }
    .cb-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid var(--border-strong, #d3d8e2);
      border-top-color: var(--accent, #6366f1);
      border-radius: 50%;
      animation: cbSkelSpin 0.7s linear infinite;
    }
    @keyframes cbSkelShimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @keyframes cbSkelSpin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class LoadingStateComponent {
  readonly variant = input<'cards' | 'rows' | 'spinner'>('rows');
  readonly count = input(4);
  readonly message = input('Loading…');

  readonly items = computed(() => Array.from({ length: Math.max(1, this.count()) }, (_, i) => i));
}
