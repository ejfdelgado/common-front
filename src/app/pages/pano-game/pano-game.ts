import { Component } from '@angular/core';
import { ThreejsComponent } from "./components/threejs/threejs.component";
import { setMobileBrowserBarsTo } from '@tools/Colors';

@Component({
  standalone: true,
  selector: 'app-pano-game',
  imports: [
    ThreejsComponent
  ],
  templateUrl: './pano-game.html',
  styleUrls: [
    './pano-game.scss',
    '../../../threejs_styles.scss',
  ],
})
export class PanoGame {
  constructor() {
    setMobileBrowserBarsTo("#000000");
  }
}
