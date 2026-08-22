import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { docLabel } from '../../utils/doc-name';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  /** True for the final crumb — a document rather than a folder. */
  isFile?: boolean;
  /** True when `label` is already a display title and must not be derived from a filename. */
  exact?: boolean;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav aria-label="Breadcrumb" class="breadcrumb-nav">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <a [routerLink]="['/']" class="crumb crumb-home" title="Home">
            <i class="fas fa-home"></i><span class="crumb-text">Home</span>
          </a>
        </li>

        <li
          class="breadcrumb-item"
          *ngFor="let item of items; let last = last"
          [class.active]="last"
          [attr.aria-current]="last ? 'page' : null"
        >
          <!-- Every ancestor is a folder you can jump back to; only the current page is inert. -->
          <a
            *ngIf="!last && item.path"
            class="crumb"
            [routerLink]="['/folder']"
            [queryParams]="{ path: item.path }"
            [title]="'Browse ' + item.label"
          >
            <i class="fas fa-folder"></i><span class="crumb-text">{{ item.label }}</span>
          </a>

          <span *ngIf="last || !item.path" class="crumb crumb-current">
            <i class="fas" [class.fa-file-lines]="item.isFile" [class.fa-folder-open]="!item.isFile"></i>
            <span class="crumb-text">{{ prettify(item) }}</span>
          </span>
        </li>
      </ol>
    </nav>
  `
})
export class BreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];

  /**
   * Show a readable title for the current document rather than a raw filename. The content view
   * replaces this with the document's own `<h1>` once it has rendered; until then (and for files
   * with no heading) a title derived from the filename is the best available label.
   */
  prettify(item: BreadcrumbItem): string {
    return item.isFile && !item.exact ? docLabel(item.label) : item.label;
  }
}
