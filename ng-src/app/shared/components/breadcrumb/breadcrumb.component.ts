import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { docLabel } from '../../../core/utils/doc-name';
import { I18nService } from '../../../core/services/i18n.service';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  /** True for the final crumb — a document rather than a folder. */
  isFile?: boolean;
  /** True when `label` is already a display title and must not be derived from a filename. */
  exact?: boolean;
  /**
   * Route this crumb links to, for trails that are not folder paths (the tag index, say).
   * Defaults to the folder view, which is what a content path wants.
   */
  route?: string;
  /** Query parameters for {@link route}. Defaults to `{ path }`. */
  query?: Record<string, string>;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav [attr.aria-label]="i18n.t('blog.nav.breadcrumb')" class="breadcrumb-nav">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <a [routerLink]="['/']" class="crumb crumb-home" [title]="i18n.t('blog.nav.home')">
            <i class="fas fa-home"></i><span class="crumb-text">{{ i18n.t('blog.nav.home') }}</span>
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
            [routerLink]="[item.route || '/folder']"
            [queryParams]="item.query || { path: item.path }"
            [title]="i18n.t('blog.nav.browseFolder', { name: item.label })"
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

  readonly i18n = inject(I18nService);

  /**
   * Show a readable title for the current document rather than a raw filename. The content view
   * replaces this with the document's own `<h1>` once it has rendered; until then (and for files
   * with no heading) a title derived from the filename is the best available label.
   */
  prettify(item: BreadcrumbItem): string {
    return item.isFile && !item.exact ? docLabel(item.label) : item.label;
  }
}
