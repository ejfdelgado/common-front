import { Component, Inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { GameMode, WorldAvatar } from 'src/types/WorldAvatar';
import { MESH_OPTIONS } from 'src/types/WorldAvatarLibrary';
import { map2KeyValueArray } from 'src/app/tools/ArrayUtil';
import { MatCardModule } from '@angular/material/card';
import { EditableInput } from 'src/app/components/fields/editable-input/editable-input';

@Component({
  selector: 'app-mode-crud',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatCardModule,
    MatInputModule,
    MatIconModule,
    MatTabsModule,
    MatSelectModule,
    EditableInput,
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
    const modes = map2KeyValueArray<GameMode>(data.modes);
    // Here, adjust data
    this.generalForm = this.fb.group({
      modes: this.fb.array((modes ?? []).map((step) => this.buildModeGroup(step))),
    });
  }

  private buildModeGroup(mode: { key: string; value: GameMode }): FormGroup {
    return this.fb.group({
      label: [mode.value.menu.name ?? '', Validators.required],
    });
  }

  get modes(): FormArray {
    return this.generalForm.get('modes') as FormArray;
  }

  async removeMode(index: number): Promise<any> {
    //
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
