import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav aria-label="breadcrumb" class="breadcrumb-nav">
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><a [routerLink]="['/']">Home</a></li>
        <li
          class="breadcrumb-item"
          *ngFor="let item of items; let last = last"
          [class.active]="last"
          [attr.aria-current]="last ? 'page' : null"
        >{{ item.label }}</li>
      </ol>
    </nav>
  `
})
export class BreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];
}
