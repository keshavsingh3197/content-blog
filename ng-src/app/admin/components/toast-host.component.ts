import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="admin-toast-host" aria-live="polite">
      <div *ngFor="let t of toast.toasts()" class="admin-toast" [ngClass]="t.kind" role="status">
        <i class="fas"
           [class.fa-circle-check]="t.kind === 'success'"
           [class.fa-circle-exclamation]="t.kind === 'error'"
           [class.fa-circle-info]="t.kind === 'info'"></i>
        <span>{{ t.message }}</span>
        <button (click)="toast.dismiss(t.id)" aria-label="Dismiss"><i class="fas fa-xmark"></i></button>
      </div>
    </div>
  `,
})
export class ToastHostComponent {
  toast = inject(ToastService);
}
