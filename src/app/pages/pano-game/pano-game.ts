import { Component } from '@angular/core';
import { ThreejsComponent } from "./components/threejs/threejs.component";

@Component({
  standalone: true,
  selector: 'app-pano-game',
  imports: [
    ThreejsComponent
  ],
  templateUrl: './pano-game.html',
  styleUrl: './pano-game.scss',
})
export class PanoGame {

}
