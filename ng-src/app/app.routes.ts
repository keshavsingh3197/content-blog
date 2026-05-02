import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'file',
    loadComponent: () => import('./components/content-view/content-view.component').then(m => m.ContentViewComponent)
  },
  {
    path: 'folder',
    loadComponent: () => import('./components/folder-view/folder-view.component').then(m => m.FolderViewComponent)
  },
  { path: '**', redirectTo: '' }
];
