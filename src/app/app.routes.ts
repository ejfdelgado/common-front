import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/index/index').then(m => m.Index),
    },
    {
        path: 'read',
        loadComponent: () => import('./pages/read/read').then(m => m.Read),
    },
    {
        path: 'rightleft',
        loadComponent: () => import('./pages/game-lr/game-lr').then(m => m.GameLr),
    },
    {
        path: 'pano',
        loadComponent: () => import('./pages/pano/pano').then(m => m.Pano),
    },
    {
        path: '**',
        redirectTo: '404',
    },
];
