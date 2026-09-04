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
    path: 'bookmarks',
    loadComponent: () => import('./features/bookmarks/bookmarks.component').then(m => m.BookmarksComponent)
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },
  // A wrong address says so rather than redirecting to the home page, where the reader would be
  // left guessing whether the link was broken or the site simply has nothing there.
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];
