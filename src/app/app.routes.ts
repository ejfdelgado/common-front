import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/index/index').then(m => m.Index),
    },
    {
        path: 'speech',
        loadComponent: () => import('./pages/speech/speech').then(m => m.Speech),
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
        path: 'panogame',
        loadComponent: () => import('./pages/pano-game/pano-game').then(m => m.PanoGame),
    },
    {
        path: 'pano',
        loadComponent: () => import('./pages/pano/pano').then(m => m.Pano),
    },
    {
        path: 'playsound',
        loadComponent: () => import('./pages/playsound/playsound').then(m => m.Playsound),
    },
    {
        path: 'practicesong',
        loadComponent: () => import('./pages/practicesong/practicesong').then(m => m.Practicesong),
    },
    {
        path: 'voyage_photo',
        loadComponent: () => import('./pages/voyage-photo/voyage-photo').then(m => m.VoyagePhoto),
    },
    {
        path: 'notes',
        loadComponent: () => import('./pages/notes/notes-list/notes-list').then(m => m.NotesList),
    },
    {
        path: 'note',
        loadComponent: () => import('./pages/notes/note/note').then(m => m.Note),
    },
    {
        path: '**',
        redirectTo: '404',
    },
];
