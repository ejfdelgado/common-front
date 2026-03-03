import { ChangeDetectorRef, Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { CommonComponent } from '@components/common.component';
import { DomSanitizer } from '@angular/platform-browser';
import { FullscreenService } from '@services/fullscreen.service';
import { CommonModule } from '@angular/common';
import { FormSimpleWith } from '@components/form-simple/form-simple-with';
import { AllFieldsDataType } from 'types/fieldsTypes';

@Component({
  selector: 'app-contact-us',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIcon,
    FormSimpleWith,
  ],
  templateUrl: './contact-us.html',
  styleUrl: './contact-us.scss',
})
export class ContactUs extends CommonComponent {

  model: any = {
    domain: "personal",
  };
  fields: AllFieldsDataType[] = [
    {
      label: "Interés", type: "select", key: "domain", required: true,
      select: {
        options: [
          { txt: "Personal", val: "personal" },
          { txt: "Emprendimiento", val: "emprendimiento" },
          { txt: "Empresarial", val: "empresarial" },
        ]
      }
    },
    { label: "Mensaje", type: "contenteditable", key: "desc" },
  ];

  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    private dialogRef: MatDialogRef<ContactUs>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public cdr: ChangeDetectorRef,
  ) {
    super(sanitizer, fullScreenSrv);
  }

  close(): void {
    this.dialogRef.close(false);
  }

  send(): void {
    this.dialogRef.close(true);
  }
}
