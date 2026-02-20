import { Component, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonComponent } from '@components/common.component';
import { FullscreenService } from '@services/fullscreen.service';
import { AssistantDataType } from 'types/ragTypes';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [],
  templateUrl: './splash.html',
  styleUrl: './splash.scss',
})
export class AlterEgoSplash extends CommonComponent {

  @Input() assistant!: AssistantDataType;

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
  ) {
    super(sanitizer, fullScreenSrv);
  }
}
