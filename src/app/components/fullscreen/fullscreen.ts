import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FullscreenService } from '@services/fullscreen.service';

@Component({
  selector: 'app-fullscreen',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
  ],
  templateUrl: './fullscreen.html',
  styleUrl: './fullscreen.scss',
})
export class Fullscreen {
  @Input() useWhiteSubtitle: boolean = true;
  isFullScreen: boolean = false;
  constructor(
    public fullScreenSrv: FullscreenService,
  ) {

  }

  setFullScreen(value: boolean) {
    this.isFullScreen = value;
    if (value) {
      this.fullScreenSrv.enterFullscreen();
    } else {
      this.fullScreenSrv.exitFullscreen();
    }
  }
}
