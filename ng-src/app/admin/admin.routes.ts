import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './guards/auth.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'users',
        canActivate: [roleGuard('Admin')],
        loadComponent: () => import('./pages/users.component').then(m => m.UsersComponent),
      },
      {
        path: 'content',
        loadComponent: () => import('./pages/content-list.component').then(m => m.ContentListComponent),
      },
      {
        path: 'content/new',
        canActivate: [roleGuard('Admin', 'Editor')],
        loadComponent: () => import('./pages/content-edit.component').then(m => m.ContentEditComponent),
      },
      {
        path: 'content/:id',
        canActivate: [roleGuard('Admin', 'Editor')],
        loadComponent: () => import('./pages/content-edit.component').then(m => m.ContentEditComponent),
      },
      {
        path: 'media',
        loadComponent: () => import('./pages/media.component').then(m => m.MediaComponent),
      },
      {
        path: 'security',
        loadComponent: () => import('./pages/security.component').then(m => m.SecurityComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
