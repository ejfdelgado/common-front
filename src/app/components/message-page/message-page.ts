import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonComponent } from '@components/common.component';
import { EditableInput } from '@components/fields/editable-input/editable-input';
import { FullscreenService } from '@services/fullscreen.service';
import { OnOffToggleComponent } from '@components/fields/on-off-toggle/on-off-toggle';
import { MDInput } from '@components/fields/md-input/md-input';

export interface MessageContentType {
  urlImage: string;
  title: string;
  content: string;
  footer: string;
  actionLabel: string;
  actionUrl: string;
}

@Component({
  selector: 'app-message-page',
  imports: [
    EditableInput,
    FormsModule,
    OnOffToggleComponent,
    MDInput,
  ],
  templateUrl: './message-page.html',
  styleUrl: './message-page.scss',
})
export class MessagePage extends CommonComponent {
  @Input() content!: MessageContentType;
  edit: boolean = false;

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService
  ) {
    super(sanitizer, fullScreenSrv);
  }

  get contentHTML() {
    return this.sanitizeMD(this.content.content);
  }

  get footerHTML() {
    return this.sanitizeMD(this.content.footer);
  }
}
