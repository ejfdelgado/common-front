import { Routes } from '@angular/router';
import { Index } from "./pages/index/index";
import { GameLr } from "./pages/game-lr/game-lr";

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
        path: '**',
        redirectTo: 'authentication/error',
    },
];
