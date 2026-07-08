import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { AvatarModel } from 'src/types/WorldAvatar';
import { SelectOptionString } from 'src/types/fieldsTypes';

const MESH_OPTIONS: SelectOptionString[] = [
  { label: 'Tigresa', value: "tigresa009_1.glb" },
  { label: 'Coco', value: "cocodrilo009_1.glb" },
  { label: 'Huesos', value: "esqueleto009_1.glb" },
];

@Component({
  selector: 'app-avatar-edit',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './avatar-edit.html',
  styleUrl: './avatar-edit.scss',
})
export class AvatarEditComponent {

  constructor(
    private dialogRef: MatDialogRef<AvatarEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AvatarModel
  ) {
    console.log(JSON.stringify(data));
  }

  save(): void {
    this.dialogRef.close(this.data);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
