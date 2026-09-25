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
import { MESH_OPTIONS } from 'src/types/WorldAvatarLibrary';
import { Subscription } from 'rxjs';

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
  private keydownSub: Subscription;
  readonly meshOptions = MESH_OPTIONS;
  generalForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AvatarEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AvatarModel,
  ) {
    this.generalForm = this.fb.group({
      meshPath: [data.meshPath ?? null],
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

    this.data.meshPath = this.generalForm.value.meshPath;

    this.dialogRef.close(this.data);
  }

  ngOnDestroy() {
    this.keydownSub.unsubscribe();
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
