import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
}

@Component({
  selector: 'app-publish-dialog',
  styleUrl: './publish-dialog.scss',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIcon,
  ],
  templateUrl: './publish-dialog.html',
})
export class PublishDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<PublishDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) { }

  accept(): void {
    this.dialogRef.close({
      accept: true,
    });
  }

  decline(): void {
    this.dialogRef.close({
      accept: false,
    });
  }
}
