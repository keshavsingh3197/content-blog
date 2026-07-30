import { Routes } from '@angular/router';
import { authGuard, onboardingGuard, roleGuard } from './guards/auth.guard';

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
        canActivate: [onboardingGuard],
        loadComponent: () => import('./pages/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'content',
        canActivate: [onboardingGuard],
        loadComponent: () => import('./pages/content-list.component').then(m => m.ContentListComponent),
      },
      {
        path: 'content/new',
        canActivate: [onboardingGuard, roleGuard('Admin', 'Editor')],
        loadComponent: () => import('./pages/content-edit.component').then(m => m.ContentEditComponent),
      },
      {
        path: 'content/:id',
        canActivate: [onboardingGuard, roleGuard('Admin', 'Editor')],
        loadComponent: () => import('./pages/content-edit.component').then(m => m.ContentEditComponent),
      },
      {
        path: 'media',
        canActivate: [onboardingGuard],
        loadComponent: () => import('./pages/media.component').then(m => m.MediaComponent),
      },
      {
        path: 'links',
        canActivate: [onboardingGuard],
        loadComponent: () => import('./pages/links.component').then(m => m.LinksComponent),
      },
      // Identity is centralized at admin.keshavsingh.in — users, security/2FA, password and
      // settings are managed there, not here. Those routes were removed from the blog admin.
    ],
  },
  { path: '**', redirectTo: '' },
];
