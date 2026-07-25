import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import { AdminApiService } from '../services/admin-api.service';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { Role, UserListItem } from '../admin.models';

interface EditModel {
  id?: string;
  email: string;
  displayName: string;
  password: string;
  roles: Role[];
  isActive: boolean;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-head">
      <div><h1 class="page-title">Users &amp; Roles</h1>
        <p class="page-sub">Control who can access the console and what they can do.</p></div>
      <button class="btn-primary" (click)="openCreate()"><i class="fas fa-user-plus"></i> Add user</button>
    </section>

    <div class="panel">
      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr><th>User</th><th>Roles</th><th>2FA</th><th>Status</th><th>Last login</th><th></th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of users(); trackBy: trackId" @rowIn>
              <td>
                <div class="cell-user">
                  <span class="admin-avatar sm">{{ initials(u.displayName) }}</span>
                  <span><strong>{{ u.displayName }}</strong><small>{{ u.email }}</small></span>
                </div>
              </td>
              <td><span class="pill" *ngFor="let r of u.roles" [ngClass]="'role-' + r.toLowerCase()">{{ r }}</span></td>
              <td>
                <span class="badge" [class.on]="u.twoFactorEnabled" [class.off]="!u.twoFactorEnabled">
                  <i class="fas" [class.fa-lock]="u.twoFactorEnabled" [class.fa-lock-open]="!u.twoFactorEnabled"></i>
                  {{ u.twoFactorEnabled ? 'On' : 'Off' }}
                </span>
              </td>
              <td>
                <span class="dot" [class.dot-green]="u.isActive" [class.dot-grey]="!u.isActive"></span>
                {{ u.isActive ? 'Active' : 'Disabled' }}
              </td>
              <td class="muted">{{ u.lastLoginAt ? (u.lastLoginAt | date:'MMM d, y') : 'Never' }}</td>
              <td class="row-actions">
                <button class="icon-btn" (click)="openEdit(u)" title="Edit"><i class="fas fa-pen"></i></button>
                <button class="icon-btn" (click)="resetPw(u)" title="Reset password"><i class="fas fa-rotate"></i></button>
                <button class="icon-btn danger" (click)="remove(u)" title="Delete"
                        [disabled]="u.id === me()"><i class="fas fa-trash"></i></button>
              </td>
            </tr>
            <tr *ngIf="!loading() && users().length === 0">
              <td colspan="6" class="empty-row"><i class="fas fa-users-slash"></i> No users yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit / create dialog (class names avoid ad-blocker "modal/popup" cosmetic filters) -->
    <div class="admin-dialog-scrim" *ngIf="editing()" (click)="close()">
      <div class="admin-dialog" (click)="$event.stopPropagation()" @modalIn>
        <div class="admin-dialog-head">
          <h3>{{ model.id ? 'Edit user' : 'Add user' }}</h3>
          <button class="icon-btn" (click)="close()"><i class="fas fa-xmark"></i></button>
        </div>
        <form class="admin-dialog-body" (ngSubmit)="save()">
          <label class="field"><span>Display name</span>
            <div class="field-input"><i class="fas fa-user"></i>
              <input name="dn" [(ngModel)]="model.displayName" required placeholder="Jane Doe"></div>
          </label>
          <label class="field"><span>Email</span>
            <div class="field-input"><i class="fas fa-envelope"></i>
              <input type="email" name="em" [(ngModel)]="model.email" [disabled]="!!model.id"
                     required placeholder="jane@example.com"></div>
          </label>
          <label class="field" *ngIf="!model.id"><span>Temporary password (min 12 chars)</span>
            <div class="field-input"><i class="fas fa-lock"></i>
              <input type="text" name="pw" [(ngModel)]="model.password" minlength="12"
                     required placeholder="Set an initial password"></div>
          </label>

          <div class="field"><span>Roles</span>
            <div class="chip-select">
              <button type="button" *ngFor="let r of allRoles" class="chip"
                      [class.on]="model.roles.includes(r)" (click)="toggleRole(r)">
                <i class="fas fa-check" *ngIf="model.roles.includes(r)"></i> {{ r }}
              </button>
            </div>
          </div>

          <label class="switch-row" *ngIf="model.id">
            <span>Account active</span>
            <input type="checkbox" name="act" [(ngModel)]="model.isActive"><span class="switch"></span>
          </label>

          <div class="admin-dialog-foot">
            <button type="button" class="btn-ghost" (click)="close()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="busy()">
              <i class="fas fa-spinner fa-spin" *ngIf="busy()"></i> Save
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  animations: [rowInAnim(), modalInAnim()],
})
export class UsersComponent implements OnInit {
  private api = inject(AdminApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  users = signal<UserListItem[]>([]);
  loading = signal(true);
  editing = signal(false);
  busy = signal(false);
  allRoles: Role[] = ['Admin', 'Editor', 'Viewer'];
  model: EditModel = this.blank();

  me = () => this.auth.user()?.id;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.listUsers().subscribe({
      next: u => { this.users.set(u); this.loading.set(false); },
      error: err => { this.loading.set(false); this.toast.fromError(err); },
    });
  }

  openCreate(): void { this.model = this.blank(); this.editing.set(true); }

  openEdit(u: UserListItem): void {
    this.model = { id: u.id, email: u.email, displayName: u.displayName, password: '', roles: [...u.roles], isActive: u.isActive };
    this.editing.set(true);
  }

  close(): void { this.editing.set(false); }

  toggleRole(r: Role): void {
    this.model.roles = this.model.roles.includes(r)
      ? this.model.roles.filter(x => x !== r)
      : [...this.model.roles, r];
  }

  save(): void {
    if (this.model.roles.length === 0) { this.toast.error('Pick at least one role.'); return; }
    this.busy.set(true);
    const done = () => { this.busy.set(false); this.editing.set(false); this.load(); };
    const fail = (e: any) => { this.busy.set(false); this.toast.fromError(e); };

    if (this.model.id) {
      this.api.updateUser(this.model.id, {
        displayName: this.model.displayName, roles: this.model.roles, isActive: this.model.isActive,
      }).subscribe({ next: () => { this.toast.success('User updated.'); done(); }, error: fail });
    } else {
      this.api.createUser({
        email: this.model.email.trim(), displayName: this.model.displayName.trim(),
        password: this.model.password, roles: this.model.roles,
      }).subscribe({ next: () => { this.toast.success('User created.'); done(); }, error: fail });
    }
  }

  resetPw(u: UserListItem): void {
    const pw = prompt(`Set a new password for ${u.email} (min 12 chars):`);
    if (!pw) return;
    if (pw.length < 12) { this.toast.error('Password must be at least 12 characters.'); return; }
    this.api.resetPassword(u.id, pw).subscribe({
      next: () => this.toast.success('Password reset. The user must sign in again.'),
      error: e => this.toast.fromError(e),
    });
  }

  remove(u: UserListItem): void {
    if (!confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    this.api.deleteUser(u.id).subscribe({
      next: () => { this.toast.success('User deleted.'); this.load(); },
      error: e => this.toast.fromError(e),
    });
  }

  initials(name: string): string {
    return name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }
  trackId = (_: number, u: UserListItem) => u.id;

  private blank(): EditModel {
    return { email: '', displayName: '', password: '', roles: ['Viewer'], isActive: true };
  }
}

// Shared animation factories (kept local to avoid a barrel file).
export function rowInAnim() {
  return trigger('rowIn', [
    transition(':enter', [style({ opacity: 0, transform: 'translateY(6px)' }),
      animate('240ms ease-out', style({ opacity: 1, transform: 'none' }))]),
  ]);
}
export function modalInAnim() {
  return trigger('modalIn', [
    transition(':enter', [style({ opacity: 0, transform: 'translateY(18px) scale(0.98)' }),
      animate('260ms cubic-bezier(0.16,1,0.3,1)', style({ opacity: 1, transform: 'none' }))]),
  ]);
}
