import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../services/toast.service';
import { TwoFactorMethod } from '../admin.models';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-page">
      <div class="auth-aside">
        <div class="auth-aside-inner">
          <span class="admin-brand-mark lg"><i class="fas fa-shield-halved"></i></span>
          <h1>Admin Console</h1>
          <p>Manage content, media, users and security for your blog — protected by two-factor authentication.</p>
          <ul class="auth-points">
            <li><i class="fas fa-user-lock"></i> Authenticator-first sign in</li>
            <li><i class="fas fa-envelope-circle-check"></i> Email code fallback</li>
            <li><i class="fas fa-key"></i> One-time backup codes</li>
          </ul>
        </div>
      </div>

      <div class="auth-panel">
        <button class="admin-topbar-btn ghost auth-theme" (click)="theme.toggle()" aria-label="Toggle theme">
          <i class="fas" [class.fa-sun]="theme.theme() === 'dark'" [class.fa-moon]="theme.theme() === 'light'"></i>
        </button>

        <!-- Step 1: credentials -->
        <form *ngIf="step() === 'password'" class="auth-card" (ngSubmit)="submitPassword()" @stepIn>
          <h2>Welcome back</h2>
          <p class="auth-sub">Sign in to continue to the console.</p>

          <label class="field">
            <span>Email</span>
            <div class="field-input"><i class="fas fa-envelope"></i>
              <input type="email" name="email" [(ngModel)]="email" autocomplete="username"
                     placeholder="you@example.com" required autofocus>
            </div>
          </label>

          <label class="field">
            <span>Password</span>
            <div class="field-input"><i class="fas fa-lock"></i>
              <input [type]="showPw ? 'text' : 'password'" name="password" [(ngModel)]="password"
                     autocomplete="current-password" placeholder="••••••••••••" required>
              <button type="button" class="field-toggle" (click)="showPw = !showPw" tabindex="-1">
                <i class="fas" [class.fa-eye]="!showPw" [class.fa-eye-slash]="showPw"></i>
              </button>
            </div>
          </label>

          <button class="btn-primary block" type="submit" [disabled]="busy()">
            <i class="fas fa-arrow-right-to-bracket" *ngIf="!busy()"></i>
            <i class="fas fa-spinner fa-spin" *ngIf="busy()"></i>
            Continue
          </button>
        </form>

        <!-- Step 2: two-factor -->
        <form *ngIf="step() === 'twofactor'" class="auth-card" (ngSubmit)="submitCode()" @stepIn>
          <button type="button" class="auth-back" (click)="backToPassword()">
            <i class="fas fa-chevron-left"></i> Back
          </button>
          <h2>Two-factor verification</h2>
          <p class="auth-sub">{{ methodHint() }}</p>

          <div class="method-tabs">
            <button type="button" [class.active]="method() === 'Totp'" (click)="setMethod('Totp')">
              <i class="fas fa-mobile-screen"></i> Authenticator
            </button>
            <button type="button" [class.active]="method() === 'Email'" (click)="setMethod('Email')">
              <i class="fas fa-envelope"></i> Email
            </button>
            <button type="button" [class.active]="method() === 'BackupCode'" (click)="setMethod('BackupCode')">
              <i class="fas fa-key"></i> Backup
            </button>
          </div>

          <label class="field">
            <span>{{ method() === 'BackupCode' ? 'Backup code' : '6-digit code' }}</span>
            <div class="field-input"><i class="fas fa-hashtag"></i>
              <input [type]="'text'" name="code" [(ngModel)]="code"
                     [attr.inputmode]="method() === 'BackupCode' ? 'text' : 'numeric'"
                     autocomplete="one-time-code" placeholder="{{ method() === 'BackupCode' ? 'xxxxx-xxxxx' : '000000' }}"
                     class="code-input" required autofocus>
            </div>
          </label>

          <button *ngIf="method() === 'Email'" type="button" class="link-btn" (click)="sendEmail()" [disabled]="busy()">
            <i class="fas fa-paper-plane"></i> Send a code to my email
          </button>

          <button class="btn-primary block" type="submit" [disabled]="busy()">
            <i class="fas fa-shield-check" *ngIf="!busy()"></i>
            <i class="fas fa-spinner fa-spin" *ngIf="busy()"></i>
            Verify &amp; sign in
          </button>
        </form>
      </div>
    </div>
  `,
  animations: [
    trigger('stepIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(14px)' }),
        animate('380ms cubic-bezier(0.16,1,0.3,1)', style({ opacity: 1, transform: 'none' })),
      ]),
    ]),
  ],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  theme = inject(ThemeService);

  email = '';
  password = '';
  code = '';
  showPw = false;

  step = signal<'password' | 'twofactor'>('password');
  method = signal<TwoFactorMethod>('Totp');
  busy = signal(false);
  private twoFactorToken = '';

  methodHint(): string {
    switch (this.method()) {
      case 'Totp': return 'Enter the 6-digit code from your authenticator app.';
      case 'Email': return 'We can email you a one-time code as a fallback.';
      case 'BackupCode': return 'Enter one of your saved one-time backup codes.';
    }
  }

  setMethod(m: TwoFactorMethod): void {
    this.method.set(m);
    this.code = '';
  }

  submitPassword(): void {
    if (!this.email || !this.password) return;
    this.busy.set(true);
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: res => {
        this.busy.set(false);
        if (res.twoFactorRequired && res.twoFactorToken) {
          this.twoFactorToken = res.twoFactorToken;
          this.step.set('twofactor');
        } else if (res.tokens) {
          this.success();
        }
      },
      error: err => {
        this.busy.set(false);
        this.toast.fromError(err, 'Invalid credentials.');
      },
    });
  }

  submitCode(): void {
    if (!this.code) return;
    this.busy.set(true);
    this.auth.verifyTwoFactor(this.twoFactorToken, this.code.trim(), this.method()).subscribe({
      next: () => this.success(),
      error: err => {
        this.busy.set(false);
        this.toast.fromError(err, 'Invalid or expired code.');
      },
    });
  }

  sendEmail(): void {
    this.busy.set(true);
    this.auth.sendEmailOtp(this.twoFactorToken).subscribe({
      next: () => { this.busy.set(false); this.toast.success('If the account exists, a code has been emailed.'); },
      error: () => { this.busy.set(false); this.toast.success('If the account exists, a code has been emailed.'); },
    });
  }

  backToPassword(): void {
    this.step.set('password');
    this.code = '';
  }

  private success(): void {
    this.busy.set(false);
    this.toast.success('Signed in.');
    this.router.navigate(['/admin']);
  }
}
