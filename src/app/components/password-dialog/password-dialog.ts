import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

export interface PasswordDialogData {
  title?: string;
  buttonText?: string;
}

@Component({
  selector: 'app-password-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './password-dialog.html',
  styleUrl: './password-dialog.scss',
})
export class PasswordDialogComponent {
  password: string = '';

  constructor(
    private dialogRef: MatDialogRef<PasswordDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PasswordDialogData
  ) {}

  confirm(): void {
    this.dialogRef.close(this.password);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
