import { ChangeDetectorRef, Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-ask-name',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIcon,
    FormsModule,
  ],
  templateUrl: './ask-name.html',
  styleUrl: './ask-name.scss',
})
export class AskNamePopUp {

  name: string = "";

  constructor(
    private dialogRef: MatDialogRef<AskNamePopUp>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public cdr: ChangeDetectorRef,
  ) {

  }

  close(): void {
    this.dialogRef.close();
  }

  accept() {
    this.dialogRef.close(this.name);
  }
}
