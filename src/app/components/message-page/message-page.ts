import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonComponent } from '@components/common.component';
import { EditableInput } from '@components/fields/editable-input/editable-input';
import { FullscreenService } from '@services/fullscreen.service';
import { OnOffToggleComponent } from '@components/fields/on-off-toggle/on-off-toggle';
import { MDInput } from '@components/fields/md-input/md-input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface MessageContentType {
  urlImage: string;
  title: string;
  content: string;
  footer: string;
  actionLabel?: string;
  actionUrl: string;
}

@Component({
  selector: 'app-message-page',
  imports: [
    EditableInput,
    FormsModule,
    OnOffToggleComponent,
    MDInput,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './message-page.html',
  styleUrl: './message-page.scss',
})
export class MessagePage extends CommonComponent {
  @Input() content!: MessageContentType;
  @Input() canEdit: boolean = false;
  @Output() saveEvent: EventEmitter<MessageContentType> = new EventEmitter();
  @Output() actionEvent: EventEmitter<void> = new EventEmitter();
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

  get titleHTML() {
    return this.sanitizeText(this.content.title);
  }

  get labelHTML() {
    return this.sanitizeText(this.content.actionLabel);
  }

  async save() {
    this.saveEvent.emit(this.content);
  }

  async actionFired() {
    this.actionEvent.emit();
  }
}
