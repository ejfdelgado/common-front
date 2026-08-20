import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { AvatarModel, WorldAvatar } from 'src/types/WorldAvatar';
import { MESH_OPTIONS } from 'src/types/WorldAvatarLibrary';

@Component({
  selector: 'app-mode-crud',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTabsModule,
    MatSelectModule,
  ],
  templateUrl: './mode-crud.html',
  styleUrl: './mode-crud.scss',
})
export class ModeCrudComponent {
  readonly meshOptions = MESH_OPTIONS;

  generalForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ModeCrudComponent>,
    @Inject(MAT_DIALOG_DATA) public data: WorldAvatar,
  ) {
    // Here, adjust data
    this.generalForm = this.fb.group({});
  }

  save(): void {
    if (this.generalForm.invalid) {
      this.generalForm.markAllAsTouched();
      return;
    }

    // TODO here copy

    this.dialogRef.close(this.data);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
