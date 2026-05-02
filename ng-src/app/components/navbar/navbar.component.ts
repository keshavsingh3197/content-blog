import { Component, OnInit, HostListener, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ContentService } from '../../services/content.service';
import { ThemeService } from '../../services/theme.service';
import { FileNode } from '../../models/file-node.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark fixed-top">
      <div class="container-fluid">
        <a class="navbar-brand fw-bold" [routerLink]="['/']">
          <i class="fas fa-code me-2"></i>Content Blog
        </a>
        <div class="d-flex align-items-center order-lg-3 gap-2">
          <button class="theme-toggle-btn" (click)="themeService.toggle()" aria-label="Toggle theme">
            <i class="fas"
               [class.fa-sun]="themeService.theme() === 'dark'"
               [class.fa-moon]="themeService.theme() === 'light'"></i>
          </button>
          <button
            class="navbar-toggler border-0"
            type="button"
            (click)="navCollapsed = !navCollapsed"
            aria-label="Toggle navigation"
          >
            <span class="navbar-toggler-icon"></span>
          </button>
        </div>
        <div class="navbar-collapse order-lg-2" [class.collapse]="navCollapsed">
          <ul class="navbar-nav me-auto">
            <li class="nav-item dropdown" *ngFor="let node of topNodes">
              <a
                class="nav-link dropdown-toggle"
                href="#"
                (click)="toggleDropdown($event, node.name)"
                [attr.aria-expanded]="openDropdown === node.name"
              >
                <i class="fas fa-folder me-1"></i>{{ node.name }}
              </a>
              <ul class="dropdown-menu" [class.show]="openDropdown === node.name">
                <li>
                  <a class="dropdown-item fw-semibold" href="#" (click)="navigateToFolder($event, node)">
                    <i class="fas fa-folder-open me-2"></i>Browse {{ node.name }}
                  </a>
                </li>
                <li><hr class="dropdown-divider my-1"></li>
                <li *ngFor="let child of node.children">
                  <a class="dropdown-item" href="#" (click)="navigateToFile($event, child)">
                    <i class="fas me-2"
                       [class.fa-folder]="child.isDirectory"
                       [class.fa-file-alt]="!child.isDirectory"></i>
                    {{ child.name }}
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  `
})
export class NavbarComponent implements OnInit {
  topNodes: FileNode[] = [];
  openDropdown: string | null = null;
  navCollapsed = true;

  constructor(
    public themeService: ThemeService,
    private contentService: ContentService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.contentService.getStructure().subscribe(nodes => {
      this.topNodes = nodes.filter(n => n.isDirectory);
      this.cdr.markForCheck();
    });
  }

  toggleDropdown(e: Event, name: string): void {
    e.preventDefault();
    e.stopPropagation();
    this.openDropdown = this.openDropdown === name ? null : name;
    this.cdr.markForCheck();
  }

  navigateToFolder(e: Event, node: FileNode): void {
    e.preventDefault();
    this.openDropdown = null;
    this.navCollapsed = true;
    this.cdr.markForCheck();
    this.router.navigate(['/folder'], { queryParams: { path: node.path } });
  }

  navigateToFile(e: Event, node: FileNode): void {
    e.preventDefault();
    this.openDropdown = null;
    this.navCollapsed = true;
    this.cdr.markForCheck();
    if (node.isDirectory) {
      this.router.navigate(['/folder'], { queryParams: { path: node.path } });
    } else {
      this.router.navigate(['/file'], { queryParams: { path: node.path } });
    }
  }

  @HostListener('document:click')
  closeDropdown(): void {
    if (this.openDropdown !== null) {
      this.openDropdown = null;
      this.cdr.markForCheck();
    }
  }
}
