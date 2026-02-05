import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonComponent, ImageTypeData } from '@components/common.component';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIcon } from '@angular/material/icon';
import { ConfirmDialogService } from '@services/confirm-dialog.service';
import { User } from '@angular/fire/auth';
import { CommonModule } from '@angular/common';
import { FullscreenService } from '@services/fullscreen.service';
import { DateOptionType } from 'types/DateTypes';

export interface CardDocDataType {
  shareLink?: boolean;
  shareQR?: boolean;
  showAuthorImg?: boolean;
  hasImage?: boolean,
}

@Component({
  selector: 'app-card-doc',
  imports: [
    MatCardModule,
    CommonModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatIcon,
  ],
  templateUrl: './card-doc.html',
  styleUrl: './card-doc.scss',
})
export class CardDoc extends CommonComponent {

  @Input() model: any;
  @Input() actions: string[] = [];
  @Input() user: User | null = null;
  @Input() imageType: ImageTypeData = "big";
  @Input() dateType: DateOptionType = "v1"
  @Output() createUpdate: EventEmitter<any> = new EventEmitter();
  @Output() share: EventEmitter<any> = new EventEmitter();
  @Output() delete: EventEmitter<any> = new EventEmitter();
  @Output() openDocument: EventEmitter<any> = new EventEmitter();
  @Output() events: EventEmitter<any> = new EventEmitter();
  @Input() config: CardDocDataType = {
    shareLink: true,
    shareQR: true,
    showAuthorImg: true,
    hasImage: true,
  }

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    public confirmSrv: ConfirmDialogService,
  ) {
    super(sanitizer, fullScreenSrv);
  }

  async openEdit() {
    await this.createUpdate.emit({ model: this.model });
  }

  async askDelete() {
    // ask confirm
    const confirm = await this.confirmSrv.confirm({
      title: "Está seguro?",
      message: "Al borrar no se podrá deshacer",
    });
    if (confirm) {
      await this.delete.emit({ model: this.model });
    }
  }

  async localShare(type: "link" | "qr") {
    await this.share.emit({
      model: this.model, type
    });
  }
}
