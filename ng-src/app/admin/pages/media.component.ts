import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';
import { AdminApiService } from '../services/admin-api.service';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { MediaListItem } from '../admin.models';

@Component({
  selector: 'app-admin-media',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <section class="page-head">
      <div><h1 class="page-title">Media</h1>
        <p class="page-sub">Upload and manage images used across your content.</p></div>
    </section>

    <div class="panel" *ngIf="canWrite()">
      <label class="dropzone" [class.drag]="dragging()"
             (dragover)="onDragOver($event)" (dragleave)="dragging.set(false)" (drop)="onDrop($event)">
        <input type="file" hidden accept="image/*" (change)="onPick($event)">
        <span class="dz-ico"><i class="fas fa-cloud-arrow-up"></i></span>
        <strong>Drop an image here or click to upload</strong>
        <small class="muted">PNG, JPG, GIF, WebP or SVG · up to 5 MB</small>
        <span class="dz-progress" *ngIf="uploading()"><i class="fas fa-spinner fa-spin"></i> Uploading…</span>
      </label>
    </div>

    <div class="media-grid">
      <figure class="media-card" *ngFor="let m of items(); trackBy: trackId" @rowIn>
        <div class="media-thumb">
          <img [src]="url(m)" [alt]="m.fileName" loading="lazy">
        </div>
        <figcaption>
          <span class="media-name" [title]="m.fileName">{{ m.fileName }}</span>
          <span class="media-meta">{{ size(m.size) }}</span>
        </figcaption>
        <div class="media-actions">
          <button class="icon-btn" (click)="copy(m)" title="Copy URL"><i class="fas fa-copy"></i></button>
          <button class="icon-btn danger" (click)="remove(m)" title="Delete" *ngIf="canWrite()">
            <i class="fas fa-trash"></i></button>
        </div>
      </figure>

      <div class="empty-card" *ngIf="!loading() && items().length === 0">
        <i class="fas fa-photo-film"></i><p>No media yet.</p>
      </div>
    </div>
  `,
  animations: [trigger('rowIn', [transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.96)' }),
    animate('220ms ease-out', style({ opacity: 1, transform: 'none' })),
  ])])],
})
export class MediaComponent implements OnInit {
  private api = inject(AdminApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  items = signal<MediaListItem[]>([]);
  loading = signal(true);
  uploading = signal(false);
  dragging = signal(false);

  canWrite = computed(() => this.auth.hasRole('Admin', 'Editor'));

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.listMedia().subscribe({
      next: m => { this.items.set(m); this.loading.set(false); },
      error: e => { this.loading.set(false); this.toast.fromError(e); },
    });
  }

  onDragOver(e: DragEvent): void { e.preventDefault(); this.dragging.set(true); }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) this.upload(file);
  }

  onPick(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.upload(file);
    (e.target as HTMLInputElement).value = '';
  }

  private upload(file: File): void {
    if (file.size > 5 * 1024 * 1024) { this.toast.error('File exceeds the 5 MB limit.'); return; }
    this.uploading.set(true);
    this.api.uploadMedia(file).subscribe({
      next: () => { this.uploading.set(false); this.toast.success('Uploaded.'); this.load(); },
      error: e => { this.uploading.set(false); this.toast.fromError(e); },
    });
  }

  remove(m: MediaListItem): void {
    if (!confirm(`Delete ${m.fileName}?`)) return;
    this.api.deleteMedia(m.id).subscribe({
      next: () => { this.toast.success('Deleted.'); this.load(); },
      error: e => this.toast.fromError(e),
    });
  }

  copy(m: MediaListItem): void {
    navigator.clipboard?.writeText(this.url(m)).then(
      () => this.toast.success('URL copied.'),
      () => this.toast.error('Could not copy.'));
  }

  url(m: MediaListItem): string { return this.api.mediaUrl(m.url); }

  size(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  trackId = (_: number, m: MediaListItem) => m.id;
}
