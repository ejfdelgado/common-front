import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { AvatarModel } from 'src/types/WorldAvatar';
import { SelectOptionString } from 'src/types/fieldsTypes';

// https://storage.googleapis.com/pro-ejflab-assets/avatar_assets/avatar_meshes/
const MESH_OPTIONS: SelectOptionString[] = [
  { label: 'Tigresa', value: "tigresa009_1_web.glb" },
  { label: 'Coco', value: "cocodrilo009_1_web.glb" },
  { label: 'Huesos', value: "esqueleto009_1_web.glb" },
];

@Component({
  selector: 'app-avatar-edit',
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
  templateUrl: './avatar-edit.html',
  styleUrl: './avatar-edit.scss',
})
export class AvatarEditComponent {

  readonly meshOptions = MESH_OPTIONS;

  generalForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AvatarEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AvatarModel
  ) {
    this.generalForm = this.fb.group({
      meshPath: [data.meshPath ?? null],
    });
  }

  save(): void {
    if (this.generalForm.invalid) {
      this.generalForm.markAllAsTouched();
      return;
    }

    this.data.meshPath = this.generalForm.value.meshPath;

    this.dialogRef.close(this.data);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
