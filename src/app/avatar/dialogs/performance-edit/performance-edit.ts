import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MediaPipePerformanceType, MediaPipePoseOptions } from 'src/types/BodyTypes';
import { Subscription } from 'rxjs';
import { OnOffToggleComponent } from 'src/app/components/fields/on-off-toggle/on-off-toggle';

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
    OnOffToggleComponent,
  ],
  templateUrl: './performance-edit.html',
  styleUrl: './performance-edit.scss',
})
export class PerformanceEditComponent {
  readonly poseOptions = MediaPipePoseOptions;
  private keydownSub: Subscription;
  generalForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PerformanceEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MediaPipePerformanceType,
  ) {
    this.generalForm = this.fb.group({
      pose: [data?.pose ?? 0],
      filterBackPeople: [data?.filterBackPeople ?? false],
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
    this.data.filterBackPeople = this.generalForm.value.filterBackPeople;

    this.dialogRef.close(this.data);
  }

  ngOnDestroy() {
    this.keydownSub.unsubscribe();
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
