import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ContentService } from '../../services/content.service';
import { FileNode } from '../../models/file-node.model';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="search-container">
      <div class="search-input-wrapper">
        <i class="fas fa-search search-icon"></i>
        <input
          type="text"
          class="search-input"
          placeholder="Search articles..."
          [(ngModel)]="query"
          (ngModelChange)="onQueryChange($event)"
          (keydown.escape)="clearSearch()"
          aria-label="Search articles"
        >
        <button *ngIf="query" class="search-clear" (click)="clearSearch()" aria-label="Clear search">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="search-results" *ngIf="results.length > 0 || (query && searched)">
        <div *ngIf="results.length === 0" class="search-no-results">
          <i class="fas fa-search me-2"></i>No results found for "{{ query }}"
        </div>
        <div
          class="search-result-item"
          *ngFor="let item of results"
          (click)="openFile(item)"
          role="button"
          tabindex="0"
          (keydown.enter)="openFile(item)"
        >
          <i class="fas fa-file-alt me-2 text-primary"></i>
          <div>
            <div class="fw-medium">{{ item.name }}</div>
            <small class="text-muted">{{ item.path }}</small>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SearchComponent implements OnInit {
  query = '';
  results: FileNode[] = [];
  searched = false;
  private nodes: FileNode[] = [];
  private querySubject = new Subject<string>();

  constructor(private contentService: ContentService, private router: Router) {}

  ngOnInit(): void {
    this.contentService.getStructure().subscribe(nodes => {
      this.nodes = nodes;
    });
    this.querySubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(q => {
      this.results = q ? this.contentService.searchFiles(q, this.nodes) : [];
      this.searched = !!q;
    });
  }

  onQueryChange(q: string): void {
    this.querySubject.next(q);
  }

  clearSearch(): void {
    this.query = '';
    this.results = [];
    this.searched = false;
  }

  openFile(node: FileNode): void {
    this.router.navigate(['/file'], { queryParams: { path: node.path } });
    this.clearSearch();
  }
}
