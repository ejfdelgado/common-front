import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { GameMode } from 'src/types/WorldAvatar';

interface MirrorOption {
  label: string;
  value: boolean;
}

const MIRROR_OPTIONS: MirrorOption[] = [
  { label: 'Espejo', value: true },
  { label: 'Normal', value: false },
];

@Component({
  selector: 'app-mode-edit',
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
  templateUrl: './mode-edit.html',
  styleUrl: './mode-edit.scss',
})
export class ModeEditComponent {

  readonly mirrorOptions = MIRROR_OPTIONS;

  generalForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ModeEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GameMode
  ) {
    this.generalForm = this.fb.group({
      mirror: [!!data.mirror],
    });
  }

  save(): void {
    if (this.generalForm.invalid) {
      this.generalForm.markAllAsTouched();
      return;
    }

    this.data.mirror = this.generalForm.value.mirror;

    this.dialogRef.close(this.data);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
