import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MESH_OPTIONS } from 'src/types/WorldAvatarLibrary';
import { MediaPipeHandsOptions, MediaPipePerformanceType, MediaPipePoseOptions } from 'src/types/BodyTypes';

@Component({
  selector: 'app-performance-edit',
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
  templateUrl: './performance-edit.html',
  styleUrl: './performance-edit.scss',
})
export class PerformanceEditComponent {
  readonly poseOptions = MediaPipePoseOptions;
  readonly handsOptions = MediaPipeHandsOptions;

  generalForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PerformanceEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MediaPipePerformanceType,
  ) {
    this.generalForm = this.fb.group({
      pose: [data.pose ?? 0],
      hands: [data.hands ?? 0],
    });
  }

  save(): void {
    if (this.generalForm.invalid) {
      this.generalForm.markAllAsTouched();
      return;
    }

    this.data.pose = this.generalForm.value.pose;
    this.data.hands = this.generalForm.value.hands;

    this.dialogRef.close(this.data);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
