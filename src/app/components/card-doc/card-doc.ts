import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonComponent } from '@components/common.component';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIcon } from '@angular/material/icon';
import { ConfirmDialogService } from '@services/confirm-dialog.service';
import { User } from '@angular/fire/auth';
import { environment } from 'environments/environment';
import { CommonModule } from '@angular/common';

export interface CardDocDataType {
  shareLink?: boolean;
  shareQR?: boolean;
  showAuthorImg?: boolean;
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
  @Input() user: User | null = null;
  @Input() createUpdate!: Function;
  @Input() share!: Function;
  @Input() delete!: Function;
  @Input() config: CardDocDataType = {
    shareLink: true,
    shareQR: true,
    showAuthorImg: true,
  }

  constructor(
    public override sanitizer: DomSanitizer,
    public confirmSrv: ConfirmDialogService,
  ) {
    super(sanitizer);
  }

  async openEdit() {
    await this.createUpdate(this.model);
  }

  async askDelete() {
    // ask confirm
    const confirm = await this.confirmSrv.confirm({
      title: "Está seguro?",
      message: "Al borrar no se podrá deshacer",
    });
    if (confirm) {
      await this.delete(this.model);
    }
  }

  async localShare(type: "link" | "qr") {
    await this.share(this.model, type);
  }
}
