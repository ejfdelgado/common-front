import { ChangeDetectorRef, Component, Inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import {
  GameController,
  GameControllerEnum,
  GameMode,
  MIRROR_OPTIONS,
  WorldAvatar,
} from 'src/types/WorldAvatar';
import { map2KeyValueArray } from 'src/app/tools/ArrayUtil';
import { MatCardModule } from '@angular/material/card';
import { Subscription } from 'rxjs';
import { ConfirmDialogService } from 'src/app/services/confirm-dialog.service';
import { EmojiInputComponent } from 'src/app/components/fields/emoji-input/emoji-input';
import { SelectOptionString } from 'src/types/fieldsTypes';

export const TYPE_OPTIONS: SelectOptionString[] = [
  { label: 'Preguntas', value: 'preguntas' },
  { label: 'Test 01', value: 'test_01' },
  { label: 'Test 02', value: 'test_02' },
  { label: 'Test 03', value: 'test_03' },
];

export const CONTROLLERS_MAP: { [key: string]: GameController[] } = {
  preguntas: [
    // Caveat: also modify ./src/assets/scenarios/base.json
    { id: GameControllerEnum.ComparableController, params: {} },
    { id: GameControllerEnum.Stand2dController, params: {} },
    { id: GameControllerEnum.CubeController, params: { enabled: false } },
    { id: GameControllerEnum.SoundFeedbackController, params: {} },
    { id: GameControllerEnum.QuestionaireController, params: {} },
  ],
  test_01: [
    { id: GameControllerEnum.ComparableController, params: {} },
    { id: GameControllerEnum.Stand2dController, params: {} },
    //{ id: GameControllerEnum.CubeController, params: { enabled: false } },
    { id: GameControllerEnum.SoundFeedbackController, params: {} },
    { id: GameControllerEnum.SharePoseController, params: {} },
    //{ id: GameControllerEnum.FingerController, params: {} },
    { id: GameControllerEnum.ArmsPointerController, params: {} },
    { id: GameControllerEnum.HandPointerController, params: {} },
  ],
  test_02: [
    { id: GameControllerEnum.ComparableController, params: {} },
    { id: GameControllerEnum.SimplePosesDetection, params: {} },
    { id: GameControllerEnum.TerrainElevationController, params: {} },
    { id: GameControllerEnum.WalkController, params: {} },
    { id: GameControllerEnum.Stand2dController, params: {} },
    { id: GameControllerEnum.SoundFeedbackController, params: {} },
    { id: GameControllerEnum.SharePoseController, params: {} },
  ],
  test_03: [
    { id: GameControllerEnum.ComparableController, params: {} },
    { id: GameControllerEnum.SimplePosesDetection, params: {} },
    { id: GameControllerEnum.HandsCloseController, params: {} },
    { id: GameControllerEnum.TerrainElevationController, params: {} },
    { id: GameControllerEnum.WalkController, params: {} },
    { id: GameControllerEnum.Stand2dController, params: {} },
    { id: GameControllerEnum.SoundFeedbackController, params: {} },
    { id: GameControllerEnum.RecordPoseController, params: {} },
    { id: GameControllerEnum.CubeController, params: { enabled: false } },
  ],
};

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
    EmojiInputComponent,
  ],
  templateUrl: './mode-crud.html',
  styleUrl: './mode-crud.scss',
})
export class ModeCrudComponent {
  originalModes: { key: string; value: GameMode }[] = [];
  readonly typeOptions = TYPE_OPTIONS;
  private keydownSub: Subscription;
  generalForm: FormGroup;
  readonly mirrorOptions = MIRROR_OPTIONS;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ModeCrudComponent>,
    @Inject(MAT_DIALOG_DATA) public data: WorldAvatar,
    public confirmSrv: ConfirmDialogService,
    private cdr: ChangeDetectorRef,
  ) {
    this.originalModes = JSON.parse(JSON.stringify(map2KeyValueArray<GameMode>(data.modes)));
    // sort
    this.originalModes.sort((a, b) => {
      return a.value.order - b.value.order;
    });
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
      icon: [mode.value.menu.icon ?? '😀', Validators.required],
      type: [mode.value.type ?? '', Validators.required],
      mirror: [!!mode.value.mirror, Validators.required],
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

  modeModeDown(index: number) {
    this.moveMode(index, index + 1);
  }

  modeModeUp(index: number) {
    this.moveMode(index, index - 1);
  }

  private moveMode(from: number, to: number) {
    if (to < 0 || to >= this.modes.length) {
      return;
    }
    const control = this.modes.at(from);
    this.modes.removeAt(from);
    this.modes.insert(to, control);
    this.cdr.detectChanges();
  }

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
        originalMode.order = index;

        // Assign values
        const name = modeGroup.get('name')?.value;
        if (name) {
          originalMode.menu.name = name;
        }
        const icon = modeGroup.get('icon')?.value;
        if (icon) {
          originalMode.menu.icon = icon;
        }
        const mirror = modeGroup.get('mirror')?.value;
        if (typeof mirror == 'boolean') {
          originalMode.mirror = mirror;
        }
        const type = modeGroup.get('type')?.value;
        if (type) {
          originalMode.type = type;
          const controllers = CONTROLLERS_MAP[type];
          if (controllers) {
            originalMode.controllers = controllers;
          }
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
    const newMode = { key: this.nextModeId(), value: this.buildEmptyMode(this.modes.length) };
    this.originalModes.push(newMode);
    this.modes.push(this.buildModeGroup(newMode));
  }

  private nextModeId(): string {
    return crypto.randomUUID();
  }

  private buildEmptyMode(order: number): GameMode {
    return {
      order,
      menu: {
        name: `Nivel ${this.modes.length + 1}`,
        icon: '',
      },
      mirror: true,
      defaultPosition: {
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        rotationY: 0,
      },
      defaultCameraState: {
        near: 0.1,
        far: 1000,
        fov: 30,
        lookAt: {
          x: 0,
          y: 1,
          z: 0,
        },
        position: {
          x: 0,
          y: 1,
          z: 5,
        },
      },
      defaultSenario: 'scenario',
      scenarios: {
        scenario: {
          useComposer: true,
          background: { color: { r: 1, g: 1, b: 1 } },
          characters: [],
          meshes: [],
          stepsConfig: {
            abcdType: 'cube',
            maxQuestions: 10,
            introTitle: 'Hola, Hello, Salut!',
            winLabel: '🎉',
            looseLabel: '🥀',
          },
          steps: [],
        },
      },
      controllers: [],
    };
  }
}
