import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { EnrollStartResponse } from '../admin.models';

@Component({
  selector: 'app-admin-security',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-head">
      <div><h1 class="page-title">Security &amp; 2FA</h1>
        <p class="page-sub">Protect your account with an authenticator app.</p></div>
    </section>

    <div class="panel status-panel">
      <div class="status-line" [class.on]="enabled()">
        <span class="status-ico"><i class="fas" [class.fa-shield-halved]="enabled()" [class.fa-shield]="!enabled()"></i></span>
        <div>
          <strong>Two-factor authentication is {{ enabled() ? 'ON' : 'OFF' }}</strong>
          <small>{{ enabled()
            ? 'Your account requires a second factor at sign in.'
            : 'Add a second factor to secure your account.' }}</small>
        </div>
        <span class="status-flag" [class.ok]="enabled()">{{ enabled() ? 'Protected' : 'At risk' }}</span>
      </div>
    </div>

    <!-- Method overview: diagrammatic -->
    <div class="method-cards">
      <div class="method-card"><span class="m-ico m1"><i class="fas fa-mobile-screen-button"></i></span>
        <strong>Authenticator</strong><small>Default · TOTP codes</small></div>
      <div class="m-arrow"><i class="fas fa-arrow-right"></i></div>
      <div class="method-card"><span class="m-ico m2"><i class="fas fa-envelope"></i></span>
        <strong>Email</strong><small>Fallback code</small></div>
      <div class="m-arrow"><i class="fas fa-arrow-right"></i></div>
      <div class="method-card"><span class="m-ico m3"><i class="fas fa-key"></i></span>
        <strong>Backup codes</strong><small>One-time recovery</small></div>
    </div>

    <!-- Not enabled: enrollment wizard -->
    <div class="panel" *ngIf="!enabled()">
      <div class="panel-head"><i class="fas fa-wand-magic-sparkles"></i> Set up authenticator</div>
      <div class="panel-body">
        <div class="wizard-steps">
          <span [class.on]="step() >= 1" [class.done]="step() > 1">1 · Scan</span>
          <span [class.on]="step() >= 2" [class.done]="step() > 2">2 · Verify</span>
          <span [class.on]="step() >= 3">3 · Backup</span>
        </div>

        <div *ngIf="step() === 0" class="center">
          <button class="btn-primary" (click)="start()" [disabled]="busy()">
            <i class="fas fa-spinner fa-spin" *ngIf="busy()"></i>
            <i class="fas fa-play" *ngIf="!busy()"></i> Begin setup
          </button>
        </div>

        <div *ngIf="step() === 1 && enroll()" class="enroll-scan" @fade>
          <div class="qr-box"><img [src]="enroll()!.qrCodePngDataUrl" alt="Authenticator QR code"></div>
          <div class="scan-help">
            <p>1. Open Google Authenticator, Microsoft Authenticator, or 1Password.</p>
            <p>2. Scan this QR code, or enter the key manually:</p>
            <code class="secret">{{ enroll()!.secret }}</code>
            <button class="btn-primary" (click)="step.set(2)"><i class="fas fa-arrow-right"></i> Next</button>
          </div>
        </div>

        <div *ngIf="step() === 2" class="center enroll-verify" @fade>
          <p class="muted">Enter the 6-digit code shown in your app.</p>
          <input class="code-input big" [(ngModel)]="code" inputmode="numeric" maxlength="6" placeholder="000000">
          <button class="btn-primary" (click)="confirm()" [disabled]="busy() || code.length < 6">
            <i class="fas fa-spinner fa-spin" *ngIf="busy()"></i>
            <i class="fas fa-check" *ngIf="!busy()"></i> Verify &amp; enable
          </button>
        </div>

        <div *ngIf="step() === 3" class="enroll-backup" @fade>
          <div class="backup-warn"><i class="fas fa-triangle-exclamation"></i>
            Save these one-time backup codes now. They are shown only once.</div>
          <div class="backup-grid">
            <code *ngFor="let b of backupCodes()">{{ b }}</code>
          </div>
          <div class="backup-actions">
            <button class="btn-ghost" (click)="copyCodes()"><i class="fas fa-copy"></i> Copy</button>
            <button class="btn-primary" (click)="finish()"><i class="fas fa-check"></i> I've saved them</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Enabled: management -->
    <div class="panel" *ngIf="enabled()">
      <div class="panel-head"><i class="fas fa-sliders"></i> Manage</div>
      <div class="panel-body">
        <p class="muted">To disable two-factor, confirm your password. This lowers your account security.</p>
        <div class="disable-row">
          <div class="field-input"><i class="fas fa-lock"></i>
            <input type="password" [(ngModel)]="password" placeholder="Current password" autocomplete="current-password">
          </div>
          <button class="btn-danger" (click)="disable()" [disabled]="busy() || !password">
            <i class="fas fa-shield-slash"></i> Disable 2FA
          </button>
        </div>
      </div>
    </div>
  `,
  animations: [trigger('fade', [transition(':enter', [
    style({ opacity: 0, transform: 'translateY(10px)' }),
    animate('300ms cubic-bezier(0.16,1,0.3,1)', style({ opacity: 1, transform: 'none' })),
  ])])],
})
export class SecurityComponent {
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  enabled = computed(() => !!this.auth.user()?.twoFactorEnabled);
  step = signal(0);
  busy = signal(false);
  enroll = signal<EnrollStartResponse | null>(null);
  backupCodes = signal<string[]>([]);
  code = '';
  password = '';

  start(): void {
    this.busy.set(true);
    this.auth.enrollStart().subscribe({
      next: r => { this.enroll.set(r); this.step.set(1); this.busy.set(false); },
      error: e => { this.busy.set(false); this.toast.fromError(e); },
    });
  }

  confirm(): void {
    this.busy.set(true);
    this.auth.enrollConfirm(this.code.trim()).subscribe({
      next: r => { this.backupCodes.set(r.backupCodes); this.step.set(3); this.busy.set(false); },
      error: e => { this.busy.set(false); this.toast.fromError(e, 'That code did not match.'); },
    });
  }

  copyCodes(): void {
    navigator.clipboard?.writeText(this.backupCodes().join('\n')).then(
      () => this.toast.success('Backup codes copied.'),
      () => this.toast.error('Could not copy.'));
  }

  finish(): void {
    this.toast.success('Two-factor authentication is now enabled.');
    this.step.set(0);
    this.code = '';
  }

  disable(): void {
    this.busy.set(true);
    this.auth.disableTwoFactor(this.password).subscribe({
      next: () => { this.busy.set(false); this.password = ''; this.toast.success('Two-factor disabled.'); },
      error: e => { this.busy.set(false); this.toast.fromError(e); },
    });
  }
}
