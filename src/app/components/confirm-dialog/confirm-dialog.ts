import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from 'src/app/pipes/translate.pipe';
import { AsyncPipe } from '@angular/common';

export interface ConfirmDialogData {
  title: string;
  message: string;
  acceptText?: string;
  declineText?: string;
  langFolder?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  styleUrl: './confirm-dialog.scss',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIcon, TranslatePipe, AsyncPipe],
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
  ) {}

  accept(): void {
    this.dialogRef.close(true);
  }

  decline(): void {
    this.dialogRef.close(false);
  }
}
