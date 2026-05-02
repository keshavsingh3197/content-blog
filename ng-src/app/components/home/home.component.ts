import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ContentService } from '../../services/content.service';
import { FileNode } from '../../models/file-node.model';
import { FileTreeComponent } from '../file-tree/file-tree.component';
import { SearchComponent } from '../search/search.component';

interface TopicCard {
  name: string;
  icon: string;
  color: string;
  description: string;
  folderName: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FileTreeComponent, SearchComponent],
  template: `
    <section class="hero-section">
      <div class="container">
        <div class="row align-items-center">
          <div class="col-lg-8">
            <h1 class="hero-title">
              <i class="fas fa-code me-3"></i>Content Blog
            </h1>
            <p class="hero-subtitle">
              Comprehensive programming tutorials on C#, Azure, AWS, Docker, Kubernetes and more.
            </p>
            <div class="hero-stats">
              <div class="stat-item">
                <span class="stat-number">{{ fileCount }}</span>
                <span class="stat-label">Articles</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ topics.length }}</span>
                <span class="stat-label">Topics</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">100%</span>
                <span class="stat-label">Free</span>
              </div>
            </div>
          </div>
          <div class="col-lg-4 mt-4 mt-lg-0">
            <app-search></app-search>
          </div>
        </div>
      </div>
    </section>

    <div class="container mt-4">
      <div class="row mb-4">
        <div class="col-12 mb-3">
          <h2 class="section-heading">
            <i class="fas fa-layer-group me-2 text-primary"></i>Browse Topics
          </h2>
        </div>
        <div class="col-6 col-md-4 col-lg-3 mb-3" *ngFor="let topic of topics">
          <button
            class="topic-card w-100"
            [style.background]="topic.color"
            (click)="navigateToTopic(topic)"
            [attr.aria-label]="'Browse ' + topic.name"
          >
            <i class="fas text-white topic-icon" [ngClass]="topic.icon"></i>
            <div class="topic-title">{{ topic.name }}</div>
            <div class="topic-count">{{ topic.description }}</div>
          </button>
        </div>
      </div>
      <div class="row">
        <div class="col-12">
          <div class="sidebar-panel">
            <div class="panel-title">
              <i class="fas fa-folder-tree text-primary me-2"></i>All Files
            </div>
            <app-file-tree
              *ngIf="nodes.length > 0"
              [nodes]="nodes"
              (fileSelected)="onFileSelected($event)">
            </app-file-tree>
            <div class="loading-spinner" *ngIf="nodes.length === 0">
              <div class="spinner-border text-primary" role="status"></div>
              <span>Loading...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class HomeComponent implements OnInit {
  nodes: FileNode[] = [];
  fileCount = 0;

  topics: TopicCard[] = [
    { name: 'C# Programming', icon: 'fa-code',           color: 'linear-gradient(135deg,#667eea,#764ba2)', description: 'Language & patterns', folderName: 'CSharp' },
    { name: 'Azure Cloud',    icon: 'fa-cloud',           color: 'linear-gradient(135deg,#0072c6,#00b4f0)', description: 'Cloud services',        folderName: 'Azure' },
    { name: 'AWS',            icon: 'fa-amazon',          color: 'linear-gradient(135deg,#ff9900,#ff6600)', description: 'Amazon Web Services',    folderName: 'AWS' },
    { name: 'Containerize',   icon: 'fa-box',             color: 'linear-gradient(135deg,#0db7ed,#066da5)', description: 'Docker & Kubernetes',    folderName: 'Containerization' },
    { name: 'SQL',            icon: 'fa-database',        color: 'linear-gradient(135deg,#11998e,#38ef7d)', description: 'Database & queries',     folderName: 'SQL' },
    { name: 'Design Patterns',icon: 'fa-puzzle-piece',    color: 'linear-gradient(135deg,#f953c6,#b91d73)', description: 'GOF patterns',           folderName: 'GOF' },
    { name: 'Networking',     icon: 'fa-network-wired',   color: 'linear-gradient(135deg,#4facfe,#00f2fe)', description: 'Protocols & concepts',   folderName: 'Networking' },
    { name: 'VS Code Ext.',   icon: 'fa-puzzle-piece',    color: 'linear-gradient(135deg,#f7971e,#ffd200)', description: 'Extensions',             folderName: 'Extensions' },
  ];

  constructor(private contentService: ContentService, private router: Router) {}

  ngOnInit(): void {
    this.contentService.getStructure().subscribe(nodes => {
      this.nodes = nodes;
      this.fileCount = this.contentService.countFiles(nodes);
    });
  }

  navigateToTopic(topic: TopicCard): void {
    const topicNode = this.nodes.find(n => n.name === topic.folderName);
    if (topicNode) {
      const firstFile = this.findFirstFile(topicNode);
      if (firstFile) {
        this.router.navigate(['/file'], { queryParams: { path: firstFile.path } });
      }
    }
  }

  private findFirstFile(node: FileNode): FileNode | null {
    if (!node.isDirectory) return node;
    if (node.children) {
      for (const child of node.children) {
        const f = this.findFirstFile(child);
        if (f) return f;
      }
    }
    return null;
  }

  onFileSelected(node: FileNode): void {
    this.router.navigate(['/file'], { queryParams: { path: node.path } });
  }
}
