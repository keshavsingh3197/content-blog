import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { ContentViewComponent } from './components/content-view/content-view.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'file', component: ContentViewComponent },
  { path: '**', redirectTo: '' }
];
