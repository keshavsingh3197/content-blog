import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileNode } from '../../../core/models/file-node.model';
import { TreeStateService } from './tree-state.service';

/**
 * The recursive folder/file tree.
 *
 * Expansion state lives in {@link TreeStateService} rather than in each component instance. The
 * tree renders itself recursively, so per-instance state meant a nested branch forgot everything
 * the moment its parent collapsed and re-rendered — and there was no way for a control outside the
 * tree ("expand all") to reach into it.
 */
@Component({
  selector: 'app-file-tree',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <ul class="tree-list" role="tree">
      <li *ngFor="let node of nodes" class="tree-item" role="none">
        <ng-container *ngIf="node.isDirectory">
          <button
            type="button"
            class="tree-folder"
            role="treeitem"
            [attr.aria-expanded]="state.isExpanded(node.path)"
            (click)="state.toggle(node.path)"
          >
            <i class="fas tree-chevron"
               [class.fa-chevron-right]="!state.isExpanded(node.path)"
               [class.fa-chevron-down]="state.isExpanded(node.path)"
               aria-hidden="true"></i>
            <i class="fas tree-icon"
               [class.fa-folder]="!state.isExpanded(node.path)"
               [class.fa-folder-open]="state.isExpanded(node.path)"
               aria-hidden="true"></i>
            <span class="tree-label">{{ node.name }}</span>
            <span class="tree-count">{{ countOf(node) }}</span>
          </button>

          <app-file-tree
            *ngIf="state.isExpanded(node.path) && node.children"
            [nodes]="node.children"
            (fileSelected)="fileSelected.emit($event)"
            class="tree-children">
          </app-file-tree>
        </ng-container>

        <button
          *ngIf="!node.isDirectory"
          type="button"
          class="tree-file"
          role="treeitem"
          (click)="fileSelected.emit(node)"
        >
          <i class="fas fa-file-lines tree-icon" aria-hidden="true"></i>
          <span class="tree-label">{{ node.title || node.name }}</span>
        </button>
      </li>
    </ul>
  `
})
export class FileTreeComponent {
  @Input() nodes: FileNode[] = [];
  @Output() fileSelected = new EventEmitter<FileNode>();

  protected readonly state = inject(TreeStateService);

  /** Documents under a folder, so a collapsed branch still says how much is inside it. */
  countOf(node: FileNode): number {
    let count = 0;
    const walk = (items: FileNode[]) => {
      for (const child of items) {
        if (!child.isDirectory) count++;
        if (child.children) walk(child.children);
      }
    };
    walk(node.children ?? []);
    return count;
  }
}
