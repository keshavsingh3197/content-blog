import { Component, OnInit, HostListener, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ContentService } from '../../services/content.service';
import { ThemeService } from '../../services/theme.service';
import { I18nService } from '../../services/i18n.service';
import { CONFIG_KEYS, RuntimeConfigService } from '../../services/runtime-config.service';
import { FileNode } from '../../models/file-node.model';

/**
 * The site header. The brand label, the icons and the visibility of the language picker are all
 * runtime values from the central config — none of them is compiled in.
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <nav class="navbar navbar-expand-lg fixed-top">
      <div class="container-fluid">
        <a class="navbar-brand fw-bold" [routerLink]="['/']">
          <i class="fas fa-code me-2"></i>{{ brandName() }}
        </a>
        <div class="d-flex align-items-center order-lg-3 gap-2">
          <!-- Browsing by tag is a whole-site control, so it sits with the theme and language
               pickers rather than competing with the topic dropdowns for bar width. -->
          <a class="nav-icon-btn" [routerLink]="['/tags']"
             [title]="i18n.t('blog.tags.title')"
             [attr.aria-label]="i18n.t('blog.tags.title')">
            <i class="fas fa-tags"></i>
          </a>
          <!--
            Language picker. Rendered only when more than one language is enabled AND an admin has
            left the picker on — both are database values, so a single-language deployment shows
            nothing here.
          -->
          <label class="lang-picker" *ngIf="i18n.showPicker()">
            <span class="visually-hidden">{{ i18n.t('common.label.language') }}</span>
            <select
              [ngModel]="i18n.locale()"
              (ngModelChange)="i18n.use($event)"
              [title]="i18n.t('common.label.language')"
              [attr.aria-label]="i18n.t('common.label.language')">
              <option *ngFor="let l of i18n.locales()" [value]="l.code">{{ l.nativeName }}</option>
            </select>
          </label>
          <button class="theme-toggle-btn" (click)="themeService.toggle()"
                  [attr.aria-label]="i18n.t('common.label.theme')"
                  [title]="i18n.t('common.label.theme')">
            <i class="fas"
               [class.fa-sun]="themeService.theme() === 'dark'"
               [class.fa-moon]="themeService.theme() === 'light'"></i>
          </button>
          <button
            class="navbar-toggler border-0"
            type="button"
            (click)="navCollapsed = !navCollapsed"
            [attr.aria-label]="i18n.t('blog.nav.toggleMenu')"
          >
            <span class="navbar-toggler-icon"></span>
          </button>
        </div>
        <div class="navbar-collapse order-lg-2" [class.collapse]="navCollapsed">
          <ul class="navbar-nav me-auto" (scroll)="closeDropdown()">
            <li class="nav-item dropdown" *ngFor="let node of topNodes">
              <a
                class="nav-link dropdown-toggle"
                href="#"
                (click)="toggleDropdown($event, node.name)"
                [attr.aria-expanded]="openDropdown === node.name"
              >
                <i class="fas fa-folder me-1"></i>{{ node.name }}
              </a>
              <ul
                class="dropdown-menu"
                [class.show]="openDropdown === node.name"
                [style.top.px]="dropdownTop"
                [style.left.px]="dropdownLeft"
              >
                <li>
                  <a class="dropdown-item fw-semibold" href="#" (click)="navigateToFolder($event, node)">
                    <i class="fas fa-folder-open me-2"></i>{{ i18n.t('blog.nav.browseFolder', { name: node.name }) }}
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
  `,
  styles: [`
    .lang-picker { display:inline-flex; align-items:center; margin:0; }
    .lang-picker select {
      background:transparent; color:inherit; border:1px solid rgba(255,255,255,.3);
      border-radius:8px; padding:.2rem .35rem; font-size:.82rem; cursor:pointer; max-width:8.5rem;
    }
    /* Options render in the OS palette, so they need explicit colours to stay readable. */
    .lang-picker option { color:#111; background:#fff; }

    /*
      The topic strip is a horizontal scroller (_navbar.scss sets overflow-x:auto/overflow-y:hidden
      on .navbar-nav so the topics never wrap onto a second row). Any overflow other than visible
      clips absolutely positioned descendants, and .dropdown-menu is positioned against
      .nav-item.dropdown *inside* that scroller — so the menu opened but was clipped to nothing.
      Anchoring it to the viewport takes it out of the clipping box; the coordinates come from the
      toggle's own rect in toggleDropdown(). Only >=lg needs this: below that breakpoint
      _utilities.scss keeps .navbar-nav .dropdown-menu static and the scroller does not exist.
    */
    @media (min-width: 992px) {
      .navbar .navbar-nav .dropdown-menu.show {
        position: fixed;
        margin-top: 0;
      }
    }
  `]
})
export class NavbarComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly config = inject(RuntimeConfigService);

  topNodes: FileNode[] = [];
  openDropdown: string | null = null;
  navCollapsed = true;
  /** Viewport coordinates of the open menu; see the position:fixed note in `styles`. */
  dropdownTop: number | null = null;
  dropdownLeft: number | null = null;

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

  /** The configured brand label, itself a translation key so it follows the chosen language. */
  brandName(): string {
    return this.i18n.configText(CONFIG_KEYS.brandName, 'Content Blog');
  }

  toggleDropdown(e: Event, name: string): void {
    e.preventDefault();
    // Without this the document:click handler below runs in the same bubble and closes the menu
    // we are opening.
    e.stopPropagation();
    if (this.openDropdown === name) {
      this.closeDropdown();
      return;
    }
    this.openDropdown = name;
    // Read the toggle's position now: the menu is viewport-anchored at >=lg, so it needs absolute
    // coordinates rather than an offset from a parent that clips it.
    const toggle = e.currentTarget as HTMLElement | null;
    const rect = toggle?.getBoundingClientRect();
    this.dropdownTop = rect ? Math.round(rect.bottom + 8) : null;
    this.dropdownLeft = rect ? Math.round(rect.left) : null;
    this.cdr.markForCheck();
  }

  navigateToFolder(e: Event, node: FileNode): void {
    e.preventDefault();
    this.closeDropdown();
    this.navCollapsed = true;
    this.cdr.markForCheck();
    this.router.navigate(['/folder'], { queryParams: { path: node.path } });
  }

  navigateToFile(e: Event, node: FileNode): void {
    e.preventDefault();
    this.closeDropdown();
    this.navCollapsed = true;
    this.cdr.markForCheck();
    if (node.isDirectory) {
      this.router.navigate(['/folder'], { queryParams: { path: node.path } });
    } else {
      this.router.navigate(['/file'], { queryParams: { path: node.path } });
    }
  }

  @HostListener('document:click')
  @HostListener('window:resize')
  closeDropdown(): void {
    if (this.openDropdown === null) return;
    this.openDropdown = null;
    this.dropdownTop = null;
    this.dropdownLeft = null;
    this.cdr.markForCheck();
  }
}
