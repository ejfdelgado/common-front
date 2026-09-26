import { ChangeDetectorRef, Component, Inject } from '@angular/core';
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
    private cdr: ChangeDetectorRef,
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
    if (!confirm || this.modes.length <= 1) {
      return;
    }
    this.modes.removeAt(index);
    this.cdr.detectChanges();
  }

  async modeModeUp() {}

  save(): void {
    if (this.generalForm.invalid) {
      this.generalForm.markAllAsTouched();
      return;
    }

    let defaultMode = this.data.defaultMode;
    const modesModified: { [key: string]: GameMode } = {};

    this.modes.controls.forEach((modeGroup, index) => {
      const id = modeGroup.get('id')?.value;
      if (index == 0) {
        // The default mode will be the first
        defaultMode = id;
      }

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

  addMode() {
    const newMode = { key: this.nextModeId(), value: this.buildEmptyMode() };
    this.originalModes.push(newMode);
    this.modes.push(this.buildModeGroup(newMode));
  }

  private nextModeId(): string {
    return crypto.randomUUID();
  }

  private buildEmptyMode(): GameMode {
    return {
      menu: {
        name: `Nivel ${this.modes.length + 1}`,
        icon: '',
      },
      mirror: false,
      defaultPosition: {
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        rotationY: 0,
      },
      defaultCameraState: {
        near: 0.1,
        far: 1000,
        fov: 25,
        lookAt: { x: 0, y: 0, z: 0 },
        position: { x: 0, y: 1, z: -10 },
      },
      defaultSenario: 'scenario',
      scenarios: {
        scenario: {
          useComposer: true,
          background: { color: { r: 1, g: 1, b: 1 } },
          characters: [],
          meshes: [],
        },
      },
      controllers: [],
    };
  }
}
