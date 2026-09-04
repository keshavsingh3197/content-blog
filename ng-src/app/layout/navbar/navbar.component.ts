import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { ContentService } from '../../core/services/content.service';
import { ThemePreference, ThemeService } from '../../core/services/theme.service';
import { I18nService } from '../../core/services/i18n.service';
import { LibraryService } from '../../core/services/library.service';
import { SearchOverlayService } from '../../core/services/search-overlay.service';
import { CONFIG_KEYS } from '../../core/services/runtime-config.service';
import { FileNode } from '../../core/models/file-node.model';

/** The three appearance choices, as the menu renders them. */
const THEME_OPTIONS: ReadonlyArray<{ value: ThemePreference; icon: string; labelKey: string }> = [
  { value: 'light', icon: 'fa-sun', labelKey: 'blog.theme.light' },
  { value: 'dark', icon: 'fa-moon', labelKey: 'blog.theme.dark' },
  { value: 'system', icon: 'fa-circle-half-stroke', labelKey: 'blog.theme.system' },
];

/**
 * The site header. The brand label, the icons and the visibility of the language picker are all
 * runtime values from the central config — none of them is compiled in.
 *
 * Two structural changes worth knowing about:
 *
 * - **Search is here now.** It used to live only in the home hero, so from inside an article there
 *   was no way to search without navigating away first. The button opens the global palette; the
 *   ⌘K hint is shown only where there is room for it.
 * - **The small-screen menu is a drawer**, not an inline collapse. The old collapse pushed the
 *   topic list into the document flow underneath a `position: fixed` bar, which on a phone left the
 *   menu overlapping the page it was navigating away from.
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <nav class="navbar fixed-top" [attr.aria-label]="i18n.t('blog.nav.menu')">
      <div class="navbar-inner">
        <!-- Left: brand + drawer toggle -->
        <button
          class="nav-icon-btn navbar-burger"
          type="button"
          (click)="toggleDrawer($event)"
          [attr.aria-expanded]="drawerOpen"
          aria-controls="nav-drawer"
          [attr.aria-label]="i18n.t('blog.nav.toggleMenu')"
        >
          <span class="burger" [class.burger-open]="drawerOpen"><span></span><span></span><span></span></span>
        </button>

        <a class="navbar-brand" [routerLink]="['/']">
          <i class="fas fa-code" aria-hidden="true"></i>
          <span class="navbar-brand-text">{{ brandName() }}</span>
        </a>

        <!-- Middle: topic strip (wide viewports only) -->
        <ul class="topic-strip" role="list">
          <li class="topic-strip-item" *ngFor="let node of topNodes">
            <button
              type="button"
              class="topic-strip-link"
              [class.topic-strip-open]="openDropdown === node.name"
              (click)="toggleDropdown($event, node.name)"
              [attr.aria-expanded]="openDropdown === node.name"
            >
              <i class="fas fa-folder" aria-hidden="true"></i>{{ node.name }}
              <i class="fas fa-chevron-down topic-strip-caret" aria-hidden="true"></i>
            </button>
          </li>
        </ul>

        <!-- Right: global controls -->
        <div class="navbar-controls">
          <button type="button" class="nav-search-btn" (click)="openSearch()" [title]="i18n.t('blog.search.hint')">
            <i class="fas fa-search" aria-hidden="true"></i>
            <span class="nav-search-label">{{ i18n.t('blog.search.open') }}</span>
            <kbd class="nav-search-kbd">{{ shortcutHint }}</kbd>
          </button>

          <a class="nav-icon-btn nav-bookmarks" [routerLink]="['/bookmarks']"
             [title]="i18n.t('blog.bookmarks.title')"
             [attr.aria-label]="i18n.t('blog.bookmarks.title')">
            <i class="fas fa-bookmark" aria-hidden="true"></i>
            <span class="nav-badge" *ngIf="library.bookmarkCount()">{{ library.bookmarkCount() }}</span>
          </a>

          <a class="nav-icon-btn nav-tags" [routerLink]="['/tags']"
             [title]="i18n.t('blog.tags.title')"
             [attr.aria-label]="i18n.t('blog.tags.title')">
            <i class="fas fa-tags" aria-hidden="true"></i>
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
              [title]="i18n.t('common.label.language')">
              <option *ngFor="let l of i18n.locales()" [value]="l.code">{{ l.nativeName }}</option>
            </select>
          </label>

          <!-- Appearance. The button alone cycles; the menu picks one directly, including System. -->
          <div class="theme-control">
            <button
              type="button"
              class="nav-icon-btn theme-toggle-btn"
              (click)="toggleThemeMenu($event)"
              [attr.aria-expanded]="themeMenuOpen"
              [title]="i18n.t('common.label.theme')"
              [attr.aria-label]="i18n.t('common.label.theme')"
            >
              <i class="fas" [ngClass]="currentThemeIcon()" aria-hidden="true"></i>
            </button>
            <ul class="theme-menu" *ngIf="themeMenuOpen" role="list">
              <li *ngFor="let option of themeOptions">
                <button
                  type="button"
                  class="theme-menu-item"
                  [class.theme-menu-active]="theme.preference() === option.value"
                  (click)="chooseTheme(option.value)"
                >
                  <i class="fas" [ngClass]="option.icon" aria-hidden="true"></i>
                  {{ i18n.t(option.labelKey) }}
                  <i class="fas fa-check theme-menu-tick" *ngIf="theme.preference() === option.value" aria-hidden="true"></i>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>

    <!--
      The open topic menu, rendered OUTSIDE the nav element on purpose.

      It is position:fixed and placed from the toggle's own rect, and three separate ancestor
      properties would otherwise interfere with that: the strip's overflow-x:auto clips it, a
      mask-image on the strip clips its entire painted subtree, and the navbar's backdrop-filter
      makes the navbar - not the viewport - its containing block. Rendering it as a sibling of the
      bar removes all three at once, and only one menu is ever open, so one element is enough.

      (No backticks in this comment: it lives inside a TypeScript template literal.)
    -->
    <ul
      class="topic-menu"
      *ngIf="openMenuNode as node"
      [style.top.px]="dropdownTop"
      [style.left.px]="dropdownLeft"
      (click)="$event.stopPropagation()"
      role="list"
    >
      <li>
        <a class="topic-menu-item topic-menu-all" href="#" (click)="navigateToFolder($event, node)">
          <i class="fas fa-folder-open" aria-hidden="true"></i>
          {{ i18n.t('blog.nav.browseFolder', { name: node.name }) }}
        </a>
      </li>
      <li><hr class="topic-menu-divider"></li>
      <li *ngFor="let child of node.children">
        <a class="topic-menu-item" href="#" (click)="navigateToFile($event, child)">
          <i class="fas" [ngClass]="child.isDirectory ? 'fa-folder' : 'fa-file-lines'" aria-hidden="true"></i>
          <span class="topic-menu-label">{{ childLabel(child) }}</span>
        </a>
      </li>
    </ul>

    <!-- Small-screen drawer -->
    <div class="nav-drawer-backdrop" *ngIf="drawerOpen" (click)="closeDrawer()" role="presentation"></div>
    <aside
      class="nav-drawer"
      id="nav-drawer"
      [class.nav-drawer-open]="drawerOpen"
      [attr.aria-hidden]="!drawerOpen"
      (click)="$event.stopPropagation()"
    >
      <div class="nav-drawer-head">
        <span class="nav-drawer-title">{{ i18n.t('blog.nav.topics') }}</span>
        <button type="button" class="nav-icon-btn" (click)="closeDrawer()"
                [attr.aria-label]="i18n.t('common.actions.close')">
          <i class="fas fa-times" aria-hidden="true"></i>
        </button>
      </div>

      <nav class="nav-drawer-body">
        <a class="drawer-link" [routerLink]="['/']" (click)="closeDrawer()">
          <i class="fas fa-house" aria-hidden="true"></i>{{ i18n.t('blog.nav.home') }}
        </a>
        <a class="drawer-link" [routerLink]="['/tags']" (click)="closeDrawer()">
          <i class="fas fa-tags" aria-hidden="true"></i>{{ i18n.t('blog.tags.title') }}
        </a>
        <a class="drawer-link" [routerLink]="['/bookmarks']" (click)="closeDrawer()">
          <i class="fas fa-bookmark" aria-hidden="true"></i>{{ i18n.t('blog.bookmarks.title') }}
          <span class="nav-badge" *ngIf="library.bookmarkCount()">{{ library.bookmarkCount() }}</span>
        </a>

        <hr class="drawer-divider">

        <details class="drawer-group" *ngFor="let node of topNodes">
          <summary class="drawer-group-summary">
            <i class="fas fa-folder" aria-hidden="true"></i>{{ node.name }}
            <span class="drawer-count">{{ fileCount(node) }}</span>
          </summary>
          <a class="drawer-sublink drawer-sublink-all" href="#" (click)="navigateToFolder($event, node)">
            {{ i18n.t('blog.nav.browseFolder', { name: node.name }) }}
          </a>
          <a class="drawer-sublink" *ngFor="let child of node.children"
             href="#" (click)="navigateToFile($event, child)">
            <i class="fas" [ngClass]="child.isDirectory ? 'fa-folder' : 'fa-file-lines'" aria-hidden="true"></i>
            {{ childLabel(child) }}
          </a>
        </details>
      </nav>
    </aside>
  `,
})
export class NavbarComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly library = inject(LibraryService);

  private readonly overlay = inject(SearchOverlayService);
  private readonly contentService = inject(ContentService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly themeOptions = THEME_OPTIONS;
  /** ⌘K on a Mac, Ctrl K everywhere else — showing the wrong one is worse than showing none. */
  readonly shortcutHint = isApplePlatform() ? '⌘K' : 'Ctrl K';

  topNodes: FileNode[] = [];
  openDropdown: string | null = null;
  themeMenuOpen = false;
  drawerOpen = false;

  /** Viewport coordinates of the open topic menu; see the `position: fixed` note in `_navbar.scss`. */
  dropdownTop: number | null = null;
  dropdownLeft: number | null = null;

  ngOnInit(): void {
    this.contentService.getStructure().subscribe(nodes => {
      this.topNodes = nodes.filter(n => n.isDirectory);
      this.cdr.markForCheck();
    });

    // A drawer left open across a navigation covers the page the reader just asked for. Closing on
    // NavigationEnd also covers the routes reached from somewhere other than a drawer link.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.drawerOpen || this.openDropdown || this.themeMenuOpen) {
          this.drawerOpen = false;
          this.openDropdown = null;
          this.themeMenuOpen = false;
          document.body.classList.remove('drawer-open');
          this.cdr.markForCheck();
        }
      });
  }

  /** The folder whose menu is open, or null. Drives the single menu rendered outside the bar. */
  get openMenuNode(): FileNode | null {
    return this.topNodes.find(node => node.name === this.openDropdown) ?? null;
  }

  /** The configured brand label, itself a translation key so it follows the chosen language. */
  brandName(): string {
    return this.i18n.configText(CONFIG_KEYS.brandName, 'Content Blog');
  }

  /** Icon for the *preference*, not the resolved palette: `system` has an icon of its own. */
  currentThemeIcon(): string {
    return THEME_OPTIONS.find(o => o.value === this.theme.preference())?.icon ?? 'fa-circle-half-stroke';
  }

  childLabel(node: FileNode): string {
    return node.title || node.name;
  }

  fileCount(node: FileNode): number {
    return this.contentService.countFiles([node]);
  }

  openSearch(): void {
    this.overlay.open();
  }

  chooseTheme(preference: ThemePreference): void {
    this.theme.set(preference);
    this.themeMenuOpen = false;
    this.cdr.markForCheck();
  }

  toggleThemeMenu(e: Event): void {
    e.stopPropagation();
    this.themeMenuOpen = !this.themeMenuOpen;
    this.openDropdown = null;
    this.cdr.markForCheck();
  }

  toggleDrawer(e: Event): void {
    e.stopPropagation();
    this.drawerOpen = !this.drawerOpen;
    document.body.classList.toggle('drawer-open', this.drawerOpen);
    this.cdr.markForCheck();
  }

  closeDrawer(): void {
    if (!this.drawerOpen) return;
    this.drawerOpen = false;
    document.body.classList.remove('drawer-open');
    this.cdr.markForCheck();
  }

  toggleDropdown(e: Event, name: string): void {
    e.preventDefault();
    // Without this the document:click handler below runs in the same bubble and closes the menu
    // we are opening.
    e.stopPropagation();
    this.themeMenuOpen = false;

    if (this.openDropdown === name) {
      this.closeMenus();
      return;
    }
    this.openDropdown = name;

    // Read the toggle's position now: the menu is viewport-anchored, so it needs absolute
    // coordinates rather than an offset from a parent that clips it.
    const rect = (e.currentTarget as HTMLElement | null)?.getBoundingClientRect();
    this.dropdownTop = rect ? Math.round(rect.bottom + 8) : null;
    // Keep a wide menu on screen: anchored at the toggle, but never past the right-hand edge.
    this.dropdownLeft = rect
      ? Math.round(Math.min(rect.left, Math.max(8, window.innerWidth - 288)))
      : null;
    this.cdr.markForCheck();
  }

  navigateToFolder(e: Event, node: FileNode): void {
    e.preventDefault();
    this.closeMenus();
    void this.router.navigate(['/folder'], { queryParams: { path: node.path } });
  }

  navigateToFile(e: Event, node: FileNode): void {
    e.preventDefault();
    this.closeMenus();
    const route = node.isDirectory ? '/folder' : '/file';
    void this.router.navigate([route], { queryParams: { path: node.path } });
  }

  @HostListener('document:click')
  @HostListener('window:resize')
  closeMenus(): void {
    if (this.openDropdown === null && !this.themeMenuOpen) return;
    this.openDropdown = null;
    this.themeMenuOpen = false;
    this.dropdownTop = null;
    this.dropdownLeft = null;
    this.cdr.markForCheck();
  }

  /** Escape closes whatever is open, innermost first — the drawer last. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.openDropdown || this.themeMenuOpen) {
      this.closeMenus();
      return;
    }
    this.closeDrawer();
  }
}

/** Apple platforms label the shortcut ⌘K. `userAgentData` first; `platform` is deprecated but is
 *  still the only signal in Safari, which is exactly the browser this needs to be right in. */
function isApplePlatform(): boolean {
  try {
    const data = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
    const platform = data?.platform ?? navigator.platform ?? '';
    return /mac|iphone|ipad|ipod/i.test(platform);
  } catch {
    return false;
  }
}
