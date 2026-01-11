import { Component } from '@angular/core';
import { ThreejsComponent } from "./components/threejs/threejs.component";

@Component({
  standalone: true,
  selector: 'app-pano',
  imports: [
    ThreejsComponent
  ],
  templateUrl: './pano.html',
  styleUrls: [
    './pano.scss',
    '../../../threejs_styles.scss',
  ],
})
export class Pano {

}
