import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-admin-change-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-head">
      <div>
        <h1 class="page-title">{{ forced() ? 'Set your password' : 'Change password' }}</h1>
        <p class="page-sub">{{ forced()
          ? 'You signed in with a temporary password — choose your own to continue.'
          : 'Update the password for your account.' }}</p>
      </div>
    </section>

    <div class="setup-banner" *ngIf="forced()">
      <i class="fas fa-triangle-exclamation"></i>
      <span>Step 1 of 2 — set a permanent password, then you'll enable two-factor authentication.</span>
    </div>

    <div class="panel narrow">
      <form class="panel-body" (ngSubmit)="submit()">
        <label class="field"><span>Current / temporary password</span>
          <div class="field-input"><i class="fas fa-lock"></i>
            <input type="password" name="cur" [(ngModel)]="current" autocomplete="current-password"
                   placeholder="••••••••••••" required></div>
        </label>
        <label class="field"><span>New password (min 12 characters)</span>
          <div class="field-input"><i class="fas fa-key"></i>
            <input type="password" name="nw" [(ngModel)]="next" minlength="12" autocomplete="new-password"
                   placeholder="••••••••••••" required></div>
        </label>
        <label class="field"><span>Confirm new password</span>
          <div class="field-input"><i class="fas fa-key"></i>
            <input type="password" name="cf" [(ngModel)]="confirm" autocomplete="new-password"
                   placeholder="••••••••••••" required></div>
        </label>

        <button class="btn-primary block" type="submit" [disabled]="busy()">
          <i class="fas fa-spinner fa-spin" *ngIf="busy()"></i>
          <i class="fas fa-check" *ngIf="!busy()"></i> Update password
        </button>
      </form>
    </div>
  `,
})
export class ChangePasswordComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  current = '';
  next = '';
  confirm = '';
  busy = signal(false);

  forced = computed(() => !!this.auth.user()?.mustChangePassword);

  submit(): void {
    if (this.next.length < 12) { this.toast.error('New password must be at least 12 characters.'); return; }
    if (this.next !== this.confirm) { this.toast.error('The passwords do not match.'); return; }

    this.busy.set(true);
    this.auth.changePassword(this.current, this.next).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Password updated.');
        // Continue onboarding: 2FA next if not yet enabled, else the dashboard.
        this.router.navigate([this.auth.user()?.twoFactorEnabled ? '/admin' : '/admin/security']);
      },
      error: e => { this.busy.set(false); this.toast.fromError(e); },
    });
  }
}
