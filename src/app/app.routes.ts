import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/home/home').then((m) => m.HomeComponent),
    title: 'Atlas · Chat',
  },
  {
    path: 'library',
    loadComponent: () =>
      import('./features/library/library').then((m) => m.LibraryComponent),
    title: 'Atlas · Library',
  },
  {
    path: 'tools',
    loadComponent: () =>
      import('./features/tools/tools').then((m) => m.ToolsComponent),
    title: 'Atlas · Tool builder',
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings').then((m) => m.SettingsComponent),
    title: 'Atlas · Settings',
  },
  {
    path: 'security',
    loadComponent: () =>
      import('./features/security/security').then((m) => m.SecurityComponent),
    title: 'Atlas · Security',
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./features/about/about').then((m) => m.AboutComponent),
    title: 'Atlas · About',
  },
  {
    path: 'guide',
    loadComponent: () =>
      import('./features/guide/guide').then((m) => m.GuideComponent),
    title: 'Atlas · Guide',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
