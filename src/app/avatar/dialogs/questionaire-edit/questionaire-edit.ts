import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { GameScenario } from 'src/types/WorldAvatar';

@Component({
  selector: 'app-questionaire-edit',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './questionaire-edit.html',
  styleUrl: './questionaire-edit.scss',
})
export class QuestionaireEditComponent {

  constructor(
    private dialogRef: MatDialogRef<QuestionaireEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GameScenario
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
