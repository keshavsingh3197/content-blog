import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ContentService } from '../../services/content.service';
import { I18nService } from '../../services/i18n.service';
import { CONFIG_KEYS, RuntimeConfigService } from '../../services/runtime-config.service';
import { FileNode } from '../../models/file-node.model';
import { FileTreeComponent } from '../file-tree/file-tree.component';
import { SearchComponent } from '../search/search.component';

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

/**
 * The blog home page. The hero copy comes from the translation catalogue and the topic cards from the
 * `blog.topics` config document — adding a topic is a config edit plus two strings, not a deploy.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FileTreeComponent, SearchComponent],
  template: `
    <section class="hero-section">
      <div class="container">
        <div class="row align-items-center">
          <div class="col-lg-7">
            <span class="hero-eyebrow">
              <i class="fas fa-bolt"></i> {{ i18n.t('blog.hero.eyebrow') }}
            </span>
            <h1 class="hero-title">{{ i18n.t('blog.hero.title') }}</h1>
            <p class="hero-subtitle">{{ i18n.t('blog.hero.subtitle') }}</p>
            <div class="hero-stats">
              <div class="stat-item">
                <span class="stat-number">{{ fileCount }}</span>
                <span class="stat-label">{{ i18n.t('blog.hero.stat.articles') }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ topics().length }}</span>
                <span class="stat-label">{{ i18n.t('blog.hero.stat.topics') }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ i18n.t('blog.hero.stat.free') }}</span>
                <span class="stat-label">{{ i18n.t('blog.hero.stat.forever') }}</span>
              </div>
            </div>
          </div>
          <div class="col-lg-5 mt-4 mt-lg-0">
            <app-search></app-search>
          </div>
        </div>
      </div>
    </section>

    <div class="container mt-4">
      <div class="row mb-4">
        <div class="col-12 mb-3">
          <h2 class="section-heading">
            <i class="fas fa-layer-group me-2"></i>{{ i18n.t('blog.section.browseTopics') }}
          </h2>
        </div>
        <div class="col-6 col-md-4 col-lg-3 mb-3" *ngFor="let topic of topics()">
          <button
            class="topic-card w-100"
            (click)="navigateToTopic(topic)"
            [attr.aria-label]="i18n.t('blog.nav.browseFolder', { name: i18n.t(topic.nameKey) })"
          >
            <span class="topic-icon-chip" [style.background]="topic.color">
              <i class="fas topic-icon" [ngClass]="topic.icon"></i>
            </span>
            <div class="topic-title">{{ i18n.t(topic.nameKey) }}</div>
            <div class="topic-count">{{ i18n.t(topic.descriptionKey) }}</div>
          </button>
        </div>
      </div>
      <div class="row">
        <div class="col-12">
          <div class="sidebar-panel">
            <div class="panel-title">
              <i class="fas fa-folder-tree text-primary me-2"></i>{{ i18n.t('blog.section.allFiles') }}
            </div>
            <app-file-tree
              *ngIf="nodes.length > 0"
              [nodes]="nodes"
              (fileSelected)="onFileSelected($event)">
            </app-file-tree>
            <div class="loading-spinner" *ngIf="nodes.length === 0">
              <div class="spinner-border text-primary" role="status"></div>
              <span>{{ i18n.t('common.state.loading') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class HomeComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly config = inject(RuntimeConfigService);

  nodes: FileNode[] = [];
  fileCount = 0;

  /**
   * The cards, from config. The fallback is empty rather than a duplicate list: the seeded config
   * entry is the single source, and an empty grid makes a config problem obvious instead of hiding it
   * behind a stale copy.
   */
  topics(): TopicCard[] {
    return this.config.json<TopicCard[]>(CONFIG_KEYS.blogTopics, []);
  }

  constructor(private contentService: ContentService, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.contentService.getStructure().subscribe(nodes => {
      this.nodes = nodes;
      this.fileCount = this.contentService.countFiles(nodes);
      this.cdr.markForCheck();
    });
  }

  navigateToTopic(topic: TopicCard): void {
    const topicNode = this.nodes.find(n => n.name === topic.folderName);
    if (topicNode) {
      this.router.navigate(['/folder'], { queryParams: { path: topicNode.path } });
    }
  }

  onFileSelected(node: FileNode): void {
    this.router.navigate(['/file'], { queryParams: { path: node.path } });
  }
}
