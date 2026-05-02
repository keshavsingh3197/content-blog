import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileNode } from '../../models/file-node.model';

@Component({
  selector: 'app-file-tree',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <ul class="tree-list">
      <li *ngFor="let node of nodes" class="tree-item">
        <div
          *ngIf="node.isDirectory"
          class="tree-folder"
          (click)="toggle(node)"
          role="button"
          tabindex="0"
          (keydown.enter)="toggle(node)"
        >
          <i class="fas me-2"
             [class.fa-folder]="!isExpanded(node)"
             [class.fa-folder-open]="isExpanded(node)"></i>
          <span>{{ node.name }}</span>
          <i class="fas ms-auto"
             [class.fa-chevron-right]="!isExpanded(node)"
             [class.fa-chevron-down]="isExpanded(node)"></i>
        </div>
        <app-file-tree
          *ngIf="node.isDirectory && isExpanded(node) && node.children"
          [nodes]="node.children"
          (fileSelected)="fileSelected.emit($event)"
          class="tree-children">
        </app-file-tree>
        <div
          *ngIf="!node.isDirectory"
          class="tree-file"
          (click)="fileSelected.emit(node)"
          role="button"
          tabindex="0"
          (keydown.enter)="fileSelected.emit(node)"
        >
          <i class="fas fa-file-alt me-2 text-primary"></i>
          <span>{{ node.name }}</span>
        </div>
      </li>
    </ul>
  `
})
export class FileTreeComponent {
  @Input() nodes: FileNode[] = [];
  @Output() fileSelected = new EventEmitter<FileNode>();
  private expanded = new Set<string>();

  toggle(node: FileNode): void {
    if (this.expanded.has(node.path)) {
      this.expanded.delete(node.path);
    } else {
      this.expanded.add(node.path);
    }
  }

  isExpanded(node: FileNode): boolean {
    return this.expanded.has(node.path);
  }
}
