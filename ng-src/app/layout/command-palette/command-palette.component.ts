import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener,
  OnDestroy, ViewChild, effect, inject, untracked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ContentService, SearchHit } from '../../core/services/content.service';
import { I18nService } from '../../core/services/i18n.service';
import { LibraryService } from '../../core/services/library.service';
import { SearchOverlayService } from '../../core/services/search-overlay.service';
import { FileNode } from '../../core/models/file-node.model';

/** A title split for rendering, so the matched run can be marked without touching innerHTML. */
interface TitleSegment {
  text: string;
  match: boolean;
}

/**
 * One row of the palette. Documents, folders and tags all reduce to this; `recent` is the odd one
 * out — selecting it re-runs a past search in place rather than navigating, so it carries the term
 * instead of a route.
 */
interface PaletteRow {
  kind: 'document' | 'folder' | 'tag' | 'recent';
  /** Where selecting it goes. Empty for a `recent` row, which never navigates. */
  route: string;
  query: Record<string, string>;
  segments: TitleSegment[];
  subtitle: string;
  icon: string;
  tags: string[];
}

const RECENT_KEY = 'blog.recentSearches';
const RECENT_LIMIT = 5;

/**
 * The library-wide search overlay: ⌘K / Ctrl+K anywhere, `/` outside a text field, or the navbar's
 * search button.
 *
 * Search used to exist only in the home hero, which meant that from inside an article — the place a
 * reader is most likely to want the next document — there was no way to search at all short of
 * navigating home first. This is that missing entry point, and it searches the same in-memory
 * `structure.json` the hero did, so it costs one already-shared fetch and no API.
 *
 * With an empty field it is not blank: it offers recent searches, the reader's bookmarks and the
 * top-level topics, which makes it a navigator as well as a search box.
 *
 * Result titles are marked up by splitting the string in TypeScript and rendering the pieces
 * through interpolation. Highlighting via `innerHTML` would put document titles — which come from
 * author-controlled front matter — through the HTML parser for a purely cosmetic gain.
 */
@Component({
  selector: 'app-command-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="palette-backdrop"
      *ngIf="overlay.isOpen()"
      (click)="close()"
      role="presentation"
    >
      <div
        class="palette"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="i18n.t('blog.search.hint')"
        (click)="$event.stopPropagation()"
      >
        <div class="palette-field">
          <i class="fas fa-search palette-field-icon" aria-hidden="true"></i>
          <input
            #field
            type="text"
            class="palette-input"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            [attr.aria-activedescendant]="rows.length ? 'palette-row-' + activeIndex : null"
            [placeholder]="i18n.t('blog.search.placeholder')"
            [attr.aria-label]="i18n.t('blog.search.placeholder')"
            [(ngModel)]="query"
            (ngModelChange)="onQueryChange()"
            autocomplete="off"
            spellcheck="false"
          >
          <button
            type="button"
            class="palette-clear"
            *ngIf="query"
            (click)="clear()"
            [attr.aria-label]="i18n.t('common.actions.clear')"
          ><i class="fas fa-times" aria-hidden="true"></i></button>
          <kbd class="palette-esc">esc</kbd>
        </div>

        <div class="palette-body" id="palette-list" role="listbox">
          <p class="palette-group" *ngIf="groupLabel">{{ groupLabel }}</p>

          <p class="palette-empty" *ngIf="!rows.length">
            <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
            {{ query ? i18n.t('blog.search.noResults') : i18n.t('blog.search.emptyPrompt') }}
          </p>

          <button
            type="button"
            class="palette-row"
            *ngFor="let row of rows; let i = index"
            [id]="'palette-row-' + i"
            role="option"
            [attr.aria-selected]="i === activeIndex"
            [class.palette-row-active]="i === activeIndex"
            (mouseenter)="activeIndex = i"
            (click)="select(row)"
          >
            <i class="fas palette-row-icon" [ngClass]="row.icon" aria-hidden="true"></i>
            <span class="palette-row-body">
              <span class="palette-row-title">
                <ng-container *ngFor="let segment of row.segments">
                  <mark *ngIf="segment.match" class="palette-mark">{{ segment.text }}</mark>
                  <ng-container *ngIf="!segment.match">{{ segment.text }}</ng-container>
                </ng-container>
              </span>
              <span class="palette-row-sub" *ngIf="row.subtitle">{{ row.subtitle }}</span>
            </span>
            <span class="palette-row-tags" *ngIf="row.tags.length">
              <span class="palette-tag" *ngFor="let tag of row.tags">{{ tag }}</span>
            </span>
            <i class="fas fa-arrow-turn-down palette-row-enter" aria-hidden="true"></i>
          </button>
        </div>

        <div class="palette-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> {{ i18n.t('blog.search.navigateHint') }}</span>
          <span><kbd>↵</kbd> {{ i18n.t('blog.search.selectHint') }}</span>
          <span><kbd>esc</kbd> {{ i18n.t('blog.search.closeHint') }}</span>
        </div>
      </div>
    </div>
  `
})
export class CommandPaletteComponent implements OnDestroy {
  @ViewChild('field') field?: ElementRef<HTMLInputElement>;

  protected readonly overlay = inject(SearchOverlayService);
  protected readonly i18n = inject(I18nService);

  private readonly content = inject(ContentService);
  private readonly library = inject(LibraryService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  query = '';
  rows: PaletteRow[] = [];
  activeIndex = 0;
  groupLabel = '';

  private nodes: FileNode[] = [];
  private recent: string[] = readRecent();
  /** What had focus before the palette opened, so closing puts the reader back where they were. */
  private returnFocusTo: HTMLElement | null = null;

  constructor() {
    this.content.getStructure().subscribe(nodes => {
      this.nodes = nodes;
      if (this.overlay.isOpen()) this.rebuild();
      this.cdr.markForCheck();
    });

    effect(() => {
      const open = this.overlay.isOpen();

      // Everything below is wrapped: `rebuild()` calls `i18n.t()`, which reads the translation
      // bundle signal. Tracked, that would make this effect re-run when the bundle arrives or the
      // reader switches language — resetting the query and re-stealing focus in the middle of a
      // search. Only `isOpen()` should drive it.
      untracked(() => {
        // The body must not scroll behind a modal; on iOS it otherwise scrolls the page instead
        // of the result list the moment the list reaches its end.
        document.body.classList.toggle('palette-open', open);

        if (open) {
          this.returnFocusTo = document.activeElement as HTMLElement | null;
          this.query = this.overlay.seed();
          this.rebuild();
          // A macrotask, not a microtask: the field only exists once the *ngIf has been rendered,
          // and a microtask queued from inside an effect can still run before the DOM is written.
          setTimeout(() => this.field?.nativeElement.focus());
        } else {
          this.returnFocusTo?.focus?.();
          this.returnFocusTo = null;
        }
        this.cdr.markForCheck();
      });
    });
  }

  ngOnDestroy(): void {
    document.body.classList.remove('palette-open');
  }

  /**
   * The global shortcut. ⌘K/Ctrl+K works anywhere; bare `/` only outside a text field, or it would
   * swallow the slash a reader is typing into the comment box.
   */
  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.overlay.toggle();
      return;
    }

    if (!this.overlay.isOpen()) {
      if (event.key === '/' && !isTypingTarget(event.target) && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        this.overlay.open();
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.move(-1);
        break;
      case 'Home':
        if (!this.query) { event.preventDefault(); this.setActive(0); }
        break;
      case 'End':
        if (!this.query) { event.preventDefault(); this.setActive(this.rows.length - 1); }
        break;
      case 'Enter': {
        const row = this.rows[this.activeIndex];
        if (!row) return;
        event.preventDefault();
        this.select(row);
        break;
      }
    }
  }

  onQueryChange(): void {
    this.rebuild();
  }

  clear(): void {
    this.query = '';
    this.rebuild();
    this.field?.nativeElement.focus();
  }

  close(): void {
    this.overlay.close();
  }

  select(row: PaletteRow): void {
    // A past search is a query to re-run, not a place to go: refill the field and stay open.
    if (row.kind === 'recent') {
      this.query = row.segments.map(segment => segment.text).join('');
      this.rebuild();
      this.field?.nativeElement.focus();
      return;
    }

    if (this.query.trim()) this.remember(this.query.trim());
    this.close();
    void this.router.navigate([row.route], { queryParams: row.query });
  }

  // ── Row building ──────────────────────────────────────────────────────────────────────────

  private rebuild(): void {
    const query = this.query.trim();
    this.rows = query ? this.searchRows(query) : this.suggestionRows();
    this.groupLabel = query
      ? this.i18n.t('blog.search.count', { count: this.rows.length })
      : this.rows.length ? this.i18n.t('blog.search.suggestions') : '';
    this.activeIndex = 0;
    this.cdr.markForCheck();
  }

  private searchRows(query: string): PaletteRow[] {
    const hits = this.content.searchDocuments(query, this.nodes, 30);
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

    const documents: PaletteRow[] = hits.map((hit: SearchHit) => ({
      kind: 'document',
      route: '/file',
      query: { path: hit.node.path },
      segments: highlight(hit.title, terms),
      subtitle: hit.node.summary || folderOf(hit.node.path),
      icon: 'fa-file-lines',
      tags: hit.matchedTags.slice(0, 3),
    }));

    // A tag row turns a search that names a subject ("docker") into a way to see everything on it,
    // not just the documents whose titles happen to contain the word.
    const tags: PaletteRow[] = this.content
      .buildTagIndex(this.nodes)
      .filter(tag => terms.some(term => tag.slug.includes(term)))
      .slice(0, 4)
      .map(tag => ({
        kind: 'tag',
        route: '/tags',
        query: { tag: tag.slug },
        segments: highlight(tag.label, terms),
        subtitle: this.i18n.t('blog.folder.fileCount', { count: tag.count }),
        icon: 'fa-tag',
        tags: [],
      }));

    return [...tags, ...documents];
  }

  /** With no query: what the reader searched before, what they saved, and the top-level topics. */
  private suggestionRows(): PaletteRow[] {
    const recent: PaletteRow[] = this.recent.map(term => ({
      kind: 'recent',
      route: '',
      query: {},
      segments: [{ text: term, match: false }],
      subtitle: this.i18n.t('blog.search.recent'),
      icon: 'fa-clock-rotate-left',
      tags: [],
    }));

    const bookmarks: PaletteRow[] = this.library.bookmarks().slice(0, 4).map(entry => ({
      kind: 'document',
      route: '/file',
      query: { path: entry.path },
      segments: [{ text: entry.title, match: false }],
      subtitle: folderOf(entry.path),
      icon: 'fa-bookmark',
      tags: [],
    }));

    const topics: PaletteRow[] = this.nodes.filter(n => n.isDirectory).slice(0, 8).map(node => ({
      kind: 'folder',
      route: '/folder',
      query: { path: node.path },
      segments: [{ text: node.name, match: false }],
      subtitle: this.i18n.t('blog.folder.fileCount', { count: this.content.countFiles([node]) }),
      icon: 'fa-folder',
      tags: [],
    }));

    return [...recent, ...bookmarks, ...topics];
  }

  private move(delta: number): void {
    if (!this.rows.length) return;
    const next = (this.activeIndex + delta + this.rows.length) % this.rows.length;
    this.setActive(next);
  }

  private setActive(index: number): void {
    this.activeIndex = Math.max(0, Math.min(this.rows.length - 1, index));
    this.cdr.markForCheck();
    queueMicrotask(() => {
      document.getElementById(`palette-row-${this.activeIndex}`)
        ?.scrollIntoView({ block: 'nearest' });
    });
  }

  private remember(term: string): void {
    this.recent = [term, ...this.recent.filter(t => t !== term)].slice(0, RECENT_LIMIT);
    writeRecent(this.recent);
  }
}

/** Split `title` so every run matching one of `terms` can be marked. Case-insensitive. */
function highlight(title: string, terms: string[]): TitleSegment[] {
  if (!terms.length) return [{ text: title, match: false }];

  const lower = title.toLowerCase();
  const marks: boolean[] = new Array(title.length).fill(false);

  for (const term of terms) {
    if (!term) continue;
    let index = lower.indexOf(term);
    while (index >= 0) {
      for (let i = index; i < index + term.length; i++) marks[i] = true;
      index = lower.indexOf(term, index + term.length);
    }
  }

  const segments: TitleSegment[] = [];
  for (let i = 0; i < title.length; i++) {
    const last = segments[segments.length - 1];
    if (last && last.match === marks[i]) last.text += title[i];
    else segments.push({ text: title[i], match: marks[i] });
  }
  return segments;
}

/** The folder part of a content path, for a result's second line. */
function folderOf(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash > 0 ? path.slice(0, slash).replace(/^src\//, '') : '';
}

/** True when the event target is somewhere the reader is typing, so `/` must reach it unhandled. */
function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = element.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable;
}

function readRecent(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === 'string' && !!t).slice(0, RECENT_LIMIT)
      : [];
  } catch {
    return [];
  }
}

function writeRecent(terms: string[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(terms));
  } catch {
    // Not persistable in this browser; recent searches simply do not survive the tab.
  }
}
