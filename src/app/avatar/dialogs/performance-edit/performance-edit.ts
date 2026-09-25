import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import {
  MediaPipeHandsOptions,
  MediaPipePerformanceType,
  MediaPipePoseOptions,
} from 'src/types/BodyTypes';
import { Subscription } from 'rxjs';

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
  private keydownSub: Subscription;
  generalForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PerformanceEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MediaPipePerformanceType,
  ) {
    this.generalForm = this.fb.group({
      pose: [data?.pose ?? 0],
      hands: [data?.hands ?? 0],
    });
    this.keydownSub = this.dialogRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.cancel();
      }
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

  ngOnDestroy() {
    this.keydownSub.unsubscribe();
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
