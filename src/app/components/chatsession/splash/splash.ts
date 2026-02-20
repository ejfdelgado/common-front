import { AfterViewInit, Component, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonComponent } from '@components/common.component';
import { FullscreenService } from '@services/fullscreen.service';
import { AssistantDataType } from 'types/ragTypes';
import { marked } from 'marked';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [],
  templateUrl: './splash.html',
  styleUrl: './splash.scss',
})
export class AlterEgoSplash extends CommonComponent implements AfterViewInit {

  @Input() assistant!: AssistantDataType;

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
  ) {
    super(sanitizer, fullScreenSrv);
  }
  ngAfterViewInit(): void {
    console.log(JSON.stringify(this.assistant, null, 4));
  }

  get assistantDescription() {
    if (this.assistant) {
      const html = marked.parse(this.assistant.description) as string;
      return this.sanitizeText(html);
    }
    return "";
  }
}
