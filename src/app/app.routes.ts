import { Routes } from '@angular/router';
import { Index } from "./pages/index/index";
import { GameLr } from "./pages/game-lr/game-lr";
import { Pano } from "./pages/pano/pano";

export const routes: Routes = [
    {
        path: '',
        component: Index,
        children: [],
    },
    {
        path: 'rightleft',
        component: GameLr,
        children: [],
    },
    {
        path: 'pano',
        component: Pano,
        children: [],
    },
    {
        path: '**',
        redirectTo: 'authentication/error',
    },
];
