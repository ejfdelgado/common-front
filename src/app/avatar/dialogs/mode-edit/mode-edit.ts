import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { GameMode } from 'src/types/WorldAvatar';

@Component({
  selector: 'app-mode-edit',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './mode-edit.html',
  styleUrl: './mode-edit.scss',
})
export class ModeEditComponent {
  password: string = '';

  constructor(
    private dialogRef: MatDialogRef<ModeEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GameMode
  ) {
    console.log(JSON.stringify(data));
  }

  save(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
