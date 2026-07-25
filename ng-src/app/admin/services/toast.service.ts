import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 1;

  success(message: string) { this.push('success', message); }
  error(message: string) { this.push('error', message); }
  info(message: string) { this.push('info', message); }

  /** Turns an HTTP error into a safe, user-friendly message. */
  fromError(err: any, fallback = 'Something went wrong.') {
    const msg = err?.error?.error ?? err?.error?.title ?? fallback;
    this.error(typeof msg === 'string' ? msg : fallback);
  }

  dismiss(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  private push(kind: Toast['kind'], message: string) {
    const id = this.nextId++;
    this.toasts.update(list => [...list, { id, kind, message }]);
    setTimeout(() => this.dismiss(id), 4200);
  }
}
