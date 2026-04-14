import { Routes } from '@angular/router';

const routes: Routes = [
    {
        path: 'index',
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
        path: 'alterego/land',
        loadComponent: () => import('./pages/alterego/land/alterego-land').then(m => m.AlteregoLandComponent),
    },
    {
        path: 'alterego/main',
        loadComponent: () => import('./pages/alterego/main/main').then(m => m.AlterEgoMain),
    },
    {
        path: 'alterego/index',
        loadComponent: () => import('./pages/alterego/index/index').then(m => m.AlteregoIndex),
    },
    {
        path: 'alterego/use',
        loadComponent: () => import('./pages/alterego/use/use').then(m => m.AlterEgoUse),
    },
    {
        path: 'tos',
        loadComponent: () => import('./pages/tos/tos').then(m => m.Tos),
    },
    {
        path: 'clients/main',
        loadComponent: () => import('./pages/clients/main/main').then(m => m.ClientMainComponent),
    },
    {
        path: 'clients/index',
        loadComponent: () => import('./pages/clients/index/index').then(m => m.ClientIndexComponent),
    },
    /*
    {
        path: 'game/walk',
        loadComponent: () => import('./pages/body/body.component').then(m => m.BodyComponent),
    },
    */
    {
        path: 'threejs',
        loadComponent: () => import('./pages/threejstest/threejstest.component').then(m => m.ThreejsTestComponent),
    },
    {
        path: '**',
        redirectTo: '404',
    },
];

// Rememeber add subdomains on:
// 1. https://login.domaindiscount24.com/
// 2. https://console.cloud.google.com/appengine/settings/domains?serviceId=default&project=proyeccion-colombia1
// 3. En la infra ENV vars: CORS_MAIN_ALLOWED_ORIGIN
if (["localhost"].indexOf(location.hostname) >= 0) {
    routes.unshift({
        path: '',
        //loadComponent: () => import('./pages/index/index').then(m => m.Index),
        //loadComponent: () => import('./pages/alterego/index/index').then(m => m.AlteregoIndex),
        loadComponent: () => import('./pages/alterego/land/alterego-land').then(m => m.AlteregoLandComponent),
    });
} else if (["pais.tv", "chat.pais.tv"].indexOf(location.hostname) >= 0) {
    routes.unshift({
        path: '',
        //loadComponent: () => import('./pages/alterego/index/index').then(m => m.AlteregoIndex),
        loadComponent: () => import('./pages/alterego/land/alterego-land').then(m => m.AlteregoLandComponent),
    });
} else if (["admin.pais.tv"].indexOf(location.hostname) >= 0) {
    routes.unshift({
        path: '',
        loadComponent: () => import('./pages/admin/users/users').then(m => m.UsersView),
    });
} else if (["docs.pais.tv"].indexOf(location.hostname) >= 0) {
    routes.unshift({
        path: '',
        loadComponent: () => import('./pages/documents/document-collection/document-collection').then(m => m.DocumentCollection),
    });
} else if (["lrgame.pais.tv"].indexOf(location.hostname) >= 0) {
    routes.unshift({
        path: '',
        loadComponent: () => import('./pages/game-lr/game-lr').then(m => m.GameLr),
    });
} else if (["music.pais.tv"].indexOf(location.hostname) >= 0) {
    routes.unshift({
        path: '',
        loadComponent: () => import('./pages/practicesong/practicesong').then(m => m.Practicesong),
    });
} else if (["notes.pais.tv"].indexOf(location.hostname) >= 0) {
    routes.unshift({
        path: '',
        loadComponent: () => import('./pages/notes/notes-list/notes-list').then(m => m.NotesList),
    });
} else if (["photogallery.pais.tv"].indexOf(location.hostname) >= 0) {
    routes.unshift({
        path: '',
        loadComponent: () => import('./pages/photo_gallery/collections/collections').then(m => m.CollectionsComponent),
    });
} else if (["clients.pais.tv"].indexOf(location.hostname) >= 0) {
    routes.unshift({
        path: 'clients/main',
        loadComponent: () => import('./pages/clients/main/main').then(m => m.ClientMainComponent),
    });
}

export { routes };