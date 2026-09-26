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
import { Subscription } from 'rxjs';
import { ConfirmDialogService } from 'src/app/services/confirm-dialog.service';

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
    //EditableInput,
  ],
  templateUrl: './mode-crud.html',
  styleUrl: './mode-crud.scss',
})
export class ModeCrudComponent {
  originalModes: { key: string; value: GameMode }[] = [];
  readonly meshOptions = MESH_OPTIONS;
  private keydownSub: Subscription;
  generalForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ModeCrudComponent>,
    @Inject(MAT_DIALOG_DATA) public data: WorldAvatar,
    public confirmSrv: ConfirmDialogService,
  ) {
    this.originalModes = JSON.parse(JSON.stringify(map2KeyValueArray<GameMode>(data.modes)));
    // Here, adjust data
    this.generalForm = this.fb.group({
      modes: this.fb.array((this.originalModes ?? []).map((step) => this.buildModeGroup(step))),
    });
    this.keydownSub = this.dialogRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.cancel();
      }
    });
  }

  private buildModeGroup(mode: { key: string; value: GameMode }): FormGroup {
    return this.fb.group({
      id: [mode.key],
      name: [mode.value.menu.name ?? '', Validators.required],
    });
  }

  get modes(): FormArray {
    return this.generalForm.get('modes') as FormArray;
  }

  async removeMode(index: number): Promise<any> {
    // ask confirm
    const confirm = await this.confirmSrv.confirm({
      title: 'Está seguro?',
      message: 'Al borrar no se podrá deshacer',
    });
    if (!confirm) {
      return;
    }
  }

  async modeModeUp() {}

  save(): void {
    if (this.generalForm.invalid) {
      this.generalForm.markAllAsTouched();
      return;
    }

    let defaultMode = this.data.defaultMode;
    const modesModified: { [key: string]: GameMode } = {};

    this.modes.controls.forEach((modeGroup) => {
      const id = modeGroup.get('id')?.value;

      const originalModePair = this.originalModes.find((el) => el.key == id);
      if (originalModePair && id) {
        const originalMode = originalModePair.value;

        // Assign values
        const name = modeGroup.get('name')?.value;
        if (name) {
          originalMode.menu.name = name;
        }

        modesModified[id] = originalMode;
      }
    });

    this.dialogRef.close({
      defaultMode,
      modes: modesModified,
    });
  }

  ngOnDestroy() {
    this.keydownSub.unsubscribe();
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
