import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'file',
    loadComponent: () => import('./features/content-view/content-view.component').then(m => m.ContentViewComponent)
  },
  {
    path: 'folder',
    loadComponent: () => import('./features/folder-view/folder-view.component').then(m => m.FolderViewComponent)
  },
  {
    path: 'tags',
    loadComponent: () => import('./features/tags-view/tags-view.component').then(m => m.TagsViewComponent)
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },
  { path: '**', redirectTo: '' }
];
