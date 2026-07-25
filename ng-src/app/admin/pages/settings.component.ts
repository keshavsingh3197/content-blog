import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../services/admin-api.service';
import { ToastService } from '../services/toast.service';
import { SettingsView, UpdateSettings } from '../admin.models';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-head">
      <div><h1 class="page-title">Settings</h1>
        <p class="page-sub">App configuration lives in the database — only 3 bootstrap secrets stay in env.</p></div>
      <div class="head-actions">
        <button class="btn-ghost" (click)="exportBackup()"><i class="fas fa-download"></i> Export</button>
        <label class="btn-ghost" style="cursor:pointer">
          <i class="fas fa-upload"></i> Import
          <input type="file" hidden accept="application/json" (change)="importBackup($event)">
        </label>
        <button class="btn-primary" (click)="save()" [disabled]="busy() || !s()">
          <i class="fas fa-spinner fa-spin" *ngIf="busy()"></i>
          <i class="fas fa-floppy-disk" *ngIf="!busy()"></i> Save
        </button>
      </div>
    </section>

    <div class="setup-banner" style="background:var(--accent-soft);color:var(--accent);border-color:var(--accent)">
      <i class="fas fa-shield-halved"></i>
      <span>Secrets here (SMTP password, SMS token) are encrypted at rest. The Mongo connection string,
        JWT key and AES key remain in Render env vars by design.</span>
    </div>

    <ng-container *ngIf="s() as v">
      <div class="panel">
        <div class="panel-head"><i class="fas fa-sliders"></i> General</div>
        <div class="panel-body">
          <label class="field"><span>Site title</span>
            <div class="field-input"><i class="fas fa-heading"></i>
              <input name="st" [(ngModel)]="v.siteTitle"></div>
          </label>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><i class="fas fa-shield-halved"></i> Two-factor methods</div>
        <div class="panel-body">
          <label class="switch-row"><span>Offer Email code fallback</span>
            <input type="checkbox" name="e2fa" [(ngModel)]="v.emailTwoFactorEnabled"><span class="switch"></span>
          </label>
          <label class="switch-row"><span>Offer SMS code fallback</span>
            <input type="checkbox" name="s2fa" [(ngModel)]="v.smsTwoFactorEnabled"><span class="switch"></span>
          </label>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><i class="fas fa-envelope"></i> Email (SMTP)</div>
        <div class="panel-body">
          <label class="switch-row"><span>Send real emails <small class="muted">(off = log code only)</small></span>
            <input type="checkbox" name="ee" [(ngModel)]="v.emailEnabled"><span class="switch"></span>
          </label>
          <div class="grid-2">
            <label class="field"><span>Host</span>
              <div class="field-input"><i class="fas fa-server"></i>
                <input name="eh" [(ngModel)]="v.emailHost" placeholder="smtp.example.com"></div>
            </label>
            <label class="field"><span>Port</span>
              <div class="field-input"><i class="fas fa-plug"></i>
                <input type="number" name="ep" [(ngModel)]="v.emailPort"></div>
            </label>
          </div>
          <div class="grid-2">
            <label class="field"><span>From address</span>
              <div class="field-input"><i class="fas fa-at"></i>
                <input name="efa" [(ngModel)]="v.emailFromAddress"></div>
            </label>
            <label class="field"><span>From name</span>
              <div class="field-input"><i class="fas fa-signature"></i>
                <input name="efn" [(ngModel)]="v.emailFromName"></div>
            </label>
          </div>
          <div class="grid-2">
            <label class="field"><span>Username</span>
              <div class="field-input"><i class="fas fa-user"></i>
                <input name="eu" [(ngModel)]="v.emailUsername"></div>
            </label>
            <label class="field"><span>Password <small class="muted">{{ v.emailPasswordSet ? '(set — blank keeps it)' : '(not set)' }}</small></span>
              <div class="field-input"><i class="fas fa-lock"></i>
                <input type="password" name="epw" [(ngModel)]="emailPassword" autocomplete="new-password"
                       [placeholder]="v.emailPasswordSet ? '••••••••' : ''"></div>
            </label>
          </div>
          <label class="switch-row"><span>Use STARTTLS</span>
            <input type="checkbox" name="etls" [(ngModel)]="v.emailUseStartTls"><span class="switch"></span>
          </label>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><i class="fas fa-comment-sms"></i> SMS (Twilio-compatible)</div>
        <div class="panel-body">
          <label class="switch-row"><span>Send real SMS <small class="muted">(off = log code only)</small></span>
            <input type="checkbox" name="se" [(ngModel)]="v.smsEnabled"><span class="switch"></span>
          </label>
          <div class="grid-2">
            <label class="field"><span>Account SID</span>
              <div class="field-input"><i class="fas fa-hashtag"></i>
                <input name="ssid" [(ngModel)]="v.smsAccountSid" placeholder="ACxxxxxxxx"></div>
            </label>
            <label class="field"><span>Auth token <small class="muted">{{ v.smsAuthTokenSet ? '(set — blank keeps it)' : '(not set)' }}</small></span>
              <div class="field-input"><i class="fas fa-key"></i>
                <input type="password" name="stok" [(ngModel)]="smsAuthToken" autocomplete="new-password"
                       [placeholder]="v.smsAuthTokenSet ? '••••••••' : ''"></div>
            </label>
          </div>
          <label class="field"><span>From number</span>
            <div class="field-input"><i class="fas fa-mobile-screen"></i>
              <input name="sfn" [(ngModel)]="v.smsFromNumber" placeholder="+15551234567"></div>
          </label>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><i class="fas fa-user-shield"></i> Security</div>
        <div class="panel-body grid-2">
          <label class="field"><span>Max failed logins (3–20)</span>
            <div class="field-input"><i class="fas fa-ban"></i>
              <input type="number" name="mfa" [(ngModel)]="v.maxFailedLoginAttempts"></div>
          </label>
          <label class="field"><span>Lockout minutes (1–1440)</span>
            <div class="field-input"><i class="fas fa-clock"></i>
              <input type="number" name="lm" [(ngModel)]="v.lockoutMinutes"></div>
          </label>
          <label class="field"><span>Email/SMS code minutes (1–60)</span>
            <div class="field-input"><i class="fas fa-hourglass-half"></i>
              <input type="number" name="eom" [(ngModel)]="v.emailOtpMinutes"></div>
          </label>
          <label class="field"><span>Backup codes (4–20)</span>
            <div class="field-input"><i class="fas fa-list-ol"></i>
              <input type="number" name="bcc" [(ngModel)]="v.backupCodeCount"></div>
          </label>
        </div>
      </div>
    </ng-container>
  `,
})
export class SettingsComponent implements OnInit {
  private api = inject(AdminApiService);
  private toast = inject(ToastService);

  s = signal<SettingsView | null>(null);
  busy = signal(false);
  emailPassword = '';
  smsAuthToken = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.getSettings().subscribe({
      next: v => this.s.set(v),
      error: e => this.toast.fromError(e),
    });
  }

  save(): void {
    const v = this.s();
    if (!v) return;
    this.busy.set(true);
    const body: UpdateSettings = {
      siteTitle: v.siteTitle,
      emailTwoFactorEnabled: v.emailTwoFactorEnabled,
      smsTwoFactorEnabled: v.smsTwoFactorEnabled,
      emailEnabled: v.emailEnabled,
      emailHost: v.emailHost, emailPort: Number(v.emailPort) || 587,
      emailUseStartTls: v.emailUseStartTls, emailFromAddress: v.emailFromAddress,
      emailFromName: v.emailFromName, emailUsername: v.emailUsername,
      smsEnabled: v.smsEnabled, smsAccountSid: v.smsAccountSid, smsFromNumber: v.smsFromNumber,
      maxFailedLoginAttempts: Number(v.maxFailedLoginAttempts) || 5,
      lockoutMinutes: Number(v.lockoutMinutes) || 15,
      emailOtpMinutes: Number(v.emailOtpMinutes) || 5,
      backupCodeCount: Number(v.backupCodeCount) || 10,
    };
    if (this.emailPassword) body.emailPassword = this.emailPassword;
    if (this.smsAuthToken) body.smsAuthToken = this.smsAuthToken;

    this.api.updateSettings(body).subscribe({
      next: v2 => {
        this.busy.set(false); this.s.set(v2);
        this.emailPassword = ''; this.smsAuthToken = '';
        this.toast.success('Settings saved.');
      },
      error: e => { this.busy.set(false); this.toast.fromError(e); },
    });
  }

  exportBackup(): void {
    this.api.exportSettings().subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'blog-admin-settings.json'; a.click();
        URL.revokeObjectURL(url);
        this.toast.success('Settings exported.');
      },
      error: e => this.toast.fromError(e),
    });
  }

  importBackup(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!confirm('Import will replace all current settings. Continue?')) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.api.importSettings(String(reader.result)).subscribe({
        next: v => { this.s.set(v); this.toast.success('Settings imported.'); },
        error: e => this.toast.fromError(e),
      });
    };
    reader.readAsText(file);
  }
}
