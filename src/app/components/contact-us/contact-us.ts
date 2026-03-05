import { ChangeDetectorRef, Component, Inject, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { CommonComponent } from '@components/common.component';
import { DomSanitizer } from '@angular/platform-browser';
import { FullscreenService } from '@services/fullscreen.service';
import { CommonModule } from '@angular/common';
import { FormSimpleWith } from '@components/form-simple/form-simple-with';
import { AllFieldsDataType } from 'types/fieldsTypes';
import { UINotificationSrv } from '@services/uinotifications.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-contact-us',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIcon,
  ],
  templateUrl: './contact-us.html',
  styleUrl: './contact-us.scss',
})
export class ContactUs extends CommonComponent {

  allowOpen: boolean = true;

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    private dialogRef: MatDialogRef<ContactUs>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public cdr: ChangeDetectorRef,
    private uinotificationSrv: UINotificationSrv,
    private http: HttpClient,
  ) {
    super(sanitizer, fullScreenSrv);
    this.allowOpen = data.allowOpen === true;
  }

  close(): void {
    this.dialogRef.close(false);
  }

  startNewClientAssistant() {
    window.open(`https://chat.pais.tv/#/alterego/use?col=pubknowledge&id=${environment.contactUsAssistant}`, "_blank");
  }
}
