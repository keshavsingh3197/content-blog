import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { I18nService } from '../../core/services/i18n.service';
import { LibraryService } from '../../core/services/library.service';
import { CONFIG_KEYS, RuntimeConfigService } from '../../core/services/runtime-config.service';
import { FileNode } from '../../core/models/file-node.model';
import { FileTreeComponent } from './file-tree/file-tree.component';
import { TreeStateService } from './file-tree/tree-state.service';
import { SearchLauncherComponent } from './search/search-launcher.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { parseDocName } from '../../core/utils/doc-name';

/**
 * One topic card, as the `blog.topics` config document describes it. `nameKey`/`descriptionKey` are
 * translation keys rather than text, so a card is editable AND translatable without a code change.
 */
interface TopicCard {
  nameKey: string;
  descriptionKey: string;
  icon: string;
  color: string;
  folderName: string;
}

/** A {@link TopicCard} that has been matched to a real folder — the only kind the grid renders. */
interface ResolvedCard extends TopicCard {
  node: FileNode;
}

/** Case- and separator-insensitive form, for comparing a config value with a folder name. */
function normalizeFolderName(name: string): string {
  return name.toLowerCase().replace(/[\s_-]+/g, '');
}

/**
 * The blog home page. The hero copy comes from the translation catalogue and the topic cards from the
 * `blog.topics` config document — adding a topic is a config edit plus two strings, not a deploy.
 *
 * Three sections were added below the hero, all of them built from data the page already had:
 * "continue reading" from the reader's local history, "recently updated" from the `updated` front
 * matter already in `structure.json`, and per-folder counts on the tree. None of them costs a
 * request.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, FileTreeComponent, SearchLauncherComponent, RevealDirective],
  template: `
    <section class="hero-section">
      <div class="hero-orbs" aria-hidden="true"><span></span><span></span><span></span></div>
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="hero-eyebrow">
            <i class="fas fa-bolt" aria-hidden="true"></i> {{ i18n.t('blog.hero.eyebrow') }}
          </span>
          <h1 class="hero-title">{{ i18n.t('blog.hero.title') }}</h1>
          <p class="hero-subtitle">{{ i18n.t('blog.hero.subtitle') }}</p>

          <app-search></app-search>

          <div class="hero-stats">
            <div class="stat-item">
              <span class="stat-number">{{ fileCount }}</span>
              <span class="stat-label">{{ i18n.t('blog.hero.stat.articles') }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ topics().length || topFolders.length }}</span>
              <span class="stat-label">{{ i18n.t('blog.hero.stat.topics') }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ tagCount }}</span>
              <span class="stat-label">{{ i18n.t('blog.tags.title') }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ i18n.t('blog.hero.stat.free') }}</span>
              <span class="stat-label">{{ i18n.t('blog.hero.stat.forever') }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="container home-sections">
      <!-- Where the reader left off. Local to this browser, so it is absent for a first visit. -->
      <section class="resume-strip" *ngIf="library.lastRead() as last" [appReveal]="0">
        <div class="resume-icon"><i class="fas fa-book-open-reader" aria-hidden="true"></i></div>
        <div class="resume-body">
          <span class="resume-label">{{ i18n.t('blog.section.continueReading') }}</span>
          <a class="resume-title" [routerLink]="['/file']" [queryParams]="{ path: last.path }">
            {{ last.title }}
          </a>
        </div>
        <a class="resume-go" [routerLink]="['/file']" [queryParams]="{ path: last.path }"
           [attr.aria-label]="i18n.t('blog.section.continueReading')">
          <i class="fas fa-arrow-right" aria-hidden="true"></i>
        </a>
      </section>

      <!-- Topics -->
      <section class="home-block">
        <h2 class="section-heading">
          <i class="fas fa-layer-group" aria-hidden="true"></i>{{ i18n.t('blog.section.browseTopics') }}
        </h2>
        <div class="topic-grid">
          <button
            class="topic-card"
            *ngFor="let card of cards(); let i = index"
            [appReveal]="i * 45"
            (click)="navigateToTopic(card)"
            [attr.aria-label]="i18n.t('blog.nav.browseFolder', { name: cardLabel(card) })"
          >
            <span class="topic-icon-chip" [style.background]="card.color">
              <i class="fas topic-icon" [ngClass]="card.icon" aria-hidden="true"></i>
            </span>
            <span class="topic-title">{{ cardLabel(card) }}</span>
            <span class="topic-count">{{ cardDescription(card) }}</span>
            <span class="topic-arrow"><i class="fas fa-arrow-right" aria-hidden="true"></i></span>
          </button>
        </div>
      </section>

      <!-- Recently updated -->
      <section class="home-block" *ngIf="recent.length" [appReveal]="0">
        <h2 class="section-heading">
          <i class="fas fa-clock-rotate-left" aria-hidden="true"></i>{{ i18n.t('blog.section.recentlyUpdated') }}
        </h2>
        <div class="recent-grid">
          <a
            class="recent-card"
            *ngFor="let doc of recent; let i = index"
            [appReveal]="i * 40"
            [routerLink]="['/file']"
            [queryParams]="{ path: doc.path }"
          >
            <span class="recent-date">
              <i class="fas fa-calendar-day" aria-hidden="true"></i>{{ i18n.formatDate(doc.updated) }}
            </span>
            <span class="recent-title">{{ docTitle(doc) }}</span>
            <span class="recent-summary" *ngIf="doc.summary">{{ doc.summary }}</span>
            <span class="recent-tags" *ngIf="doc.tags?.length">
              <span class="tag-chip tag-chip-sm" *ngFor="let tag of (doc.tags || []).slice(0, 3)">{{ tag }}</span>
            </span>
          </a>
        </div>
      </section>

      <!-- Full tree -->
      <section class="home-block">
        <div class="sidebar-panel">
          <div class="panel-title">
            <i class="fas fa-folder-tree" aria-hidden="true"></i>
            <span>{{ i18n.t('blog.section.allFiles') }}</span>
            <button
              type="button"
              class="panel-action"
              *ngIf="nodes.length"
              (click)="toggleAll()"
            >
              <i class="fas" [ngClass]="tree.isAllCollapsed ? 'fa-angles-down' : 'fa-angles-up'" aria-hidden="true"></i>
              {{ tree.isAllCollapsed ? i18n.t('blog.tree.expandAll') : i18n.t('blog.tree.collapseAll') }}
            </button>
          </div>

          <app-file-tree
            *ngIf="nodes.length > 0"
            [nodes]="nodes"
            (fileSelected)="onFileSelected($event)">
          </app-file-tree>

          <div class="loading-spinner" *ngIf="nodes.length === 0">
            <div class="spinner-border" role="status" aria-hidden="true"></div>
            <span>{{ i18n.t('common.state.loading') }}</span>
          </div>
        </div>
      </section>
    </div>
  `
})
export class HomeComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  protected readonly library = inject(LibraryService);
  protected readonly tree = inject(TreeStateService);

  private readonly config = inject(RuntimeConfigService);
  private readonly contentService = inject(ContentService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  nodes: FileNode[] = [];
  topFolders: FileNode[] = [];
  recent: FileNode[] = [];
  fileCount = 0;
  tagCount = 0;

  /**
   * The cards, from config. The fallback is empty rather than a duplicate list: the seeded config
   * entry is the single source, and an empty grid makes a config problem obvious instead of hiding it
   * behind a stale copy.
   */
  topics(): TopicCard[] {
    return this.config.json<TopicCard[]>(CONFIG_KEYS.blogTopics, []);
  }

  /**
   * What the grid actually renders.
   *
   * Every card is resolved against the content tree first and **dropped if it resolves to
   * nothing**. `folderName` is a hand-typed config value pointing at a folder in a different
   * system, so the two drift: at the time of writing the live config shipped `Interview-Prep`
   * (the folder is `Interview`) and `SQL` (no such folder), and both rendered as cards that
   * silently did nothing when clicked. A card that cannot lead anywhere is worse than no card.
   *
   * When the config has no topic cards at all — a fresh deployment, or an IdP that is briefly
   * unreachable — the top-level folders stand in, so the home page still offers a way into the
   * library instead of an empty band under a heading.
   */
  cards(): ResolvedCard[] {
    const configured = this.topics();

    if (configured.length) {
      return configured
        .map(topic => {
          const node = this.resolveFolder(topic.folderName);
          return node ? { ...topic, node } : null;
        })
        .filter((card): card is ResolvedCard => card !== null);
    }

    return this.topFolders.map((folder, index) => ({
      nameKey: folder.name,
      descriptionKey: '',
      icon: FOLDER_ICONS[index % FOLDER_ICONS.length],
      color: FOLDER_COLORS[index % FOLDER_COLORS.length],
      folderName: folder.name,
      node: folder,
    }));
  }

  /**
   * Find the top-level folder a card names, forgiving the ways the two spellings drift apart.
   *
   * Exact match first, then case- and separator-insensitive (`Interview Prep` / `interview_prep`),
   * then a unique prefix — which is what makes the configured `Interview-Prep` reach the
   * `Interview` folder. The prefix step requires exactly one candidate, so it can only ever
   * disambiguate, never guess between two folders.
   */
  private resolveFolder(folderName: string): FileNode | null {
    if (!folderName) return null;

    const exact = this.topFolders.find(n => n.name === folderName);
    if (exact) return exact;

    const wanted = normalizeFolderName(folderName);
    if (!wanted) return null;

    const insensitive = this.topFolders.find(n => normalizeFolderName(n.name) === wanted);
    if (insensitive) return insensitive;

    const prefixed = this.topFolders.filter(n => wanted.startsWith(normalizeFolderName(n.name)));
    return prefixed.length === 1 ? prefixed[0] : null;
  }

  /** A configured card labels itself through the catalogue; a derived one is already a folder name. */
  cardLabel(card: ResolvedCard): string {
    return card.descriptionKey ? this.i18n.t(card.nameKey) : card.nameKey;
  }

  cardDescription(card: ResolvedCard): string {
    if (card.descriptionKey) return this.i18n.t(card.descriptionKey);
    return this.i18n.t('blog.folder.fileCount', {
      count: this.contentService.countFiles([card.node]),
    });
  }

  ngOnInit(): void {
    this.contentService.getStructure().subscribe(nodes => {
      this.nodes = nodes;
      this.topFolders = nodes.filter(n => n.isDirectory);
      this.fileCount = this.contentService.countFiles(nodes);
      this.tagCount = this.contentService.buildTagIndex(nodes).length;
      this.recent = this.contentService.recentlyUpdated(nodes, 6);
      this.cdr.markForCheck();
    });
  }

  docTitle(node: FileNode): string {
    return node.title || parseDocName(node.name).title;
  }

  toggleAll(): void {
    if (this.tree.isAllCollapsed) this.tree.expandAll(this.nodes);
    else this.tree.collapseAll();
  }

  navigateToTopic(card: ResolvedCard): void {
    void this.router.navigate(['/folder'], { queryParams: { path: card.node.path } });
  }

  onFileSelected(node: FileNode): void {
    void this.router.navigate(['/file'], { queryParams: { path: node.path } });
  }
}

/** Stand-in art for folder-derived cards, so an unconfigured grid still reads as a set of topics. */
const FOLDER_ICONS = [
  'fa-code', 'fa-cloud', 'fa-database', 'fa-cubes', 'fa-shield-halved',
  'fa-diagram-project', 'fa-gears', 'fa-server',
];

const FOLDER_COLORS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#0072c6,#00b4f0)',
  'linear-gradient(135deg,#ff9900,#ff6600)',
  'linear-gradient(135deg,#0db7ed,#066da5)',
  'linear-gradient(135deg,#11998e,#38ef7d)',
  'linear-gradient(135deg,#f953c6,#b91d73)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#f7971e,#ffd200)',
];
