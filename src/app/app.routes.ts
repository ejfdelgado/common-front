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
        path: 'notes',
        loadComponent: () => import('./pages/notes/notes-list/notes-list').then(m => m.NotesList),
    },
    {
        path: 'photo_gallery/all',
        loadComponent: () => import('./pages/photo_gallery/collections/collections').then(m => m.CollectionsComponent),
    },
    {
        path: 'photo_gallery/this',
        loadComponent: () => import('./pages/photo_gallery/voyage-photo/voyage-photo').then(m => m.VoyagePhoto),
    },
    {
        path: 'books_gallery/all',
        loadComponent: () => import('./pages/books/book-collection/book-collection').then(m => m.BookCollection),
    },
    {
        path: 'books_gallery/this',
        loadComponent: () => import('./pages/books/book-single/book-single').then(m => m.BookSingle),
    },
    {
        path: 'docs/all',
        loadComponent: () => import('./pages/documents/document-collection/document-collection').then(m => m.DocumentCollection),
    },
    {
        path: 'docs/this',
        loadComponent: () => import('./pages/documents/document-single/document-single').then(m => m.DocumentSingle),
    },
    {
        path: 'admin/users',
        loadComponent: () => import('./pages/admin/users/users').then(m => m.UsersView),
    },
    {
        path: 'alterego/main',
        loadComponent: () => import('./pages/alterego/main/main').then(m => m.AlterEgoMain),
    },
    {
        path: '**',
        redirectTo: '404',
    },
];
