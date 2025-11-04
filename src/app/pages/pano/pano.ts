import { Component } from '@angular/core';
import { ThreejsComponent } from "./components/threejs/threejs.component";

@Component({
  standalone: true,
  selector: 'app-pano',
  imports: [
    ThreejsComponent
  ],
  templateUrl: './pano.html',
  styleUrl: './pano.scss',
})
export class Pano {

}
