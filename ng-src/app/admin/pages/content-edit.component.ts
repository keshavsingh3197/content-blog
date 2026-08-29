import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MarkdownModule } from 'ngx-markdown';
import { AdminApiService } from '../services/admin-api.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-admin-content-edit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterModule, MarkdownModule],
  template: `
    <section class="page-head">
      <div>
        <a class="crumb" routerLink="/admin/content"><i class="fas fa-chevron-left"></i> Content</a>
        <h1 class="page-title">{{ id ? 'Edit topic' : 'New topic' }}</h1>
      </div>
      <div class="head-actions">
        <button class="btn-ghost" routerLink="/admin/content">Cancel</button>
        <button class="btn-primary" (click)="save()" [disabled]="busy()">
          <i class="fas fa-spinner fa-spin" *ngIf="busy()"></i>
          <i class="fas fa-floppy-disk" *ngIf="!busy()"></i> Save
        </button>
      </div>
    </section>

    <div class="edit-grid">
      <div class="panel">
        <div class="panel-head"><i class="fas fa-pen-nib"></i> Details</div>
        <div class="panel-body">
          <label class="field"><span>Title</span>
            <div class="field-input"><i class="fas fa-heading"></i>
              <input name="t" [(ngModel)]="title" (ngModelChange)="onTitle()" placeholder="A great topic"></div>
          </label>
          <div class="grid-2">
            <label class="field"><span>Slug</span>
              <div class="field-input"><i class="fas fa-link"></i>
                <input name="s" [(ngModel)]="slug" placeholder="a-great-topic"></div>
            </label>
            <label class="field"><span>Folder</span>
              <div class="field-input"><i class="fas fa-folder"></i>
                <input name="f" [(ngModel)]="folder" placeholder="CSharp"></div>
            </label>
          </div>
          <div class="grid-2">
            <label class="field"><span>Tags (comma separated)</span>
              <div class="field-input"><i class="fas fa-tags"></i>
                <input name="tg" [(ngModel)]="tags" placeholder="csharp, oop"></div>
            </label>
            <label class="field"><span>Order</span>
              <div class="field-input"><i class="fas fa-sort"></i>
                <input type="number" name="o" [(ngModel)]="order"></div>
            </label>
          </div>
          <label class="switch-row">
            <span>Published <small class="muted">— visible on the blog</small></span>
            <input type="checkbox" name="p" [(ngModel)]="published"><span class="switch"></span>
          </label>
        </div>
      </div>

      <div class="panel editor-panel">
        <div class="panel-head">
          <i class="fas fa-code"></i> Markdown
          <div class="seg">
            <button [class.on]="view === 'write'" (click)="view = 'write'">Write</button>
            <button [class.on]="view === 'preview'" (click)="view = 'preview'">Preview</button>
            <button [class.on]="view === 'split'" (click)="view = 'split'" class="hide-sm">Split</button>
          </div>
        </div>
        <div class="editor-body" [ngClass]="view">
          <textarea *ngIf="view !== 'preview'" class="md-input" name="b" [(ngModel)]="body"
                    placeholder="# Heading&#10;&#10;Write your content in **Markdown**…"></textarea>
          <div *ngIf="view !== 'write'" class="md-preview markdown-body">
            <markdown [data]="body || '_Nothing to preview yet._'"></markdown>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ContentEditComponent implements OnInit {
  private api = inject(AdminApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  id: string | null = null;
  title = '';
  slug = '';
  folder = '';
  tags = '';
  order = 0;
  published = false;
  body = '';
  view: 'write' | 'preview' | 'split' = 'split';
  busy = signal(false);
  /** True once an existing topic's content is fully loaded; stays false if that load failed. */
  contentLoaded = false;
  /** True when loading an existing topic failed, preventing a save that would blank the topic. */
  loadFailed = false;
  private slugTouched = false;

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (!this.id) return;
    this.busy.set(true);
    this.api.getContent(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: c => {
          this.title = c.title; this.slug = c.slug; this.folder = c.folder;
          this.tags = (c.tags ?? []).join(', '); this.order = c.order;
          this.published = c.published; this.body = c.body ?? '';
          this.slugTouched = true;
          this.contentLoaded = true;
          this.busy.set(false);
        },
        error: e => {
          this.busy.set(false);
          // A failed load leaves the form empty; don't let a save PUT a blank body over the topic.
          this.loadFailed = true;
          this.toast.fromError(e, 'Could not load this topic.');
        },
      });
  }

  onTitle(): void {
    if (!this.slugTouched || !this.slug) {
      this.slug = this.title.toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }
  }

  save(): void {
    if (this.busy()) return;
    // Editing an existing topic but the load failed → the form is empty; never overwrite blindly.
    if (this.id && this.loadFailed) {
      this.toast.error('The topic failed to load. Refresh before saving.');
      return;
    }
    if (!this.title.trim()) { this.toast.error('A title is required.'); return; }
    this.busy.set(true);
    const body = {
      title: this.title.trim(),
      slug: this.slug.trim(),
      folder: this.folder.trim(),
      body: this.body,
      tags: this.tags.split(',').map(t => t.trim()).filter(Boolean),
      order: Number(this.order) || 0,
      published: this.published,
    };
    const req = this.id ? this.api.updateContent(this.id, body) : this.api.createContent(body);
    req.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.toast.success('Saved.'); this.router.navigate(['/admin/content']); },
        error: e => { this.busy.set(false); this.toast.fromError(e); },
      });
  }
}
