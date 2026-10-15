import { ChangeDetectorRef, Component, Inject, QueryList, ViewChildren } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { BACKGROUND_OPTIONS, ColorType, GameScenario, GameStep, GameStepOption, INTERACTION_OPTIONS, OBJECTS_OPTIONS } from 'src/types/WorldAvatar';
import { EditableInput } from 'src/app/components/fields/editable-input/editable-input';
import { RatingComponent } from 'src/app/components/fields/rating/rating';
import { ColorPickerComponent } from 'src/app/components/fields/color-picker/color-picker';
import {
  AudioDetailDataType,
  ImageGalleryConfigDataType,
  SelectOptionString,
  SliderDetailDataType,
} from 'src/types/fieldsTypes';
import { ImageFileComponent } from 'src/app/components/fields/image-field/image-field';
import { ComponentBucketField } from 'src/types/ComponentBucketField';
import { AudioFileComponent } from 'src/app/components/fields/sound-field/audio-field';
import { SliderComponent } from 'src/app/components/fields/slider/slider';
import { OnOffToggleComponent } from 'src/app/components/fields/on-off-toggle/on-off-toggle';
import { ClipboardUtil } from 'src/app/tools/Clipboard';
import { ModalService } from 'src/app/services/modal.service';
import { Subscription } from 'rxjs';
import { TranslatePipe } from 'src/app/pipes/translate.pipe';
import { AsyncPipe } from '@angular/common';
import { TranslateService } from 'src/app/services/translate.service';
import { translateSelectOptions } from 'src/app/tools/SelectOptionUtils';
import { ConfirmDialogService } from 'src/app/services/confirm-dialog.service';

const MIN_OPTIONS = 1;
const MAX_OPTIONS = 4;

const DEFAULT_BACKGROUND_COLOR: ColorType = { r: 255, g: 255, b: 255 };
const DEFAULT_BACKGROUND_IMAGE: string = '/avatar_assets/backgrounds/default.jpeg';

const LANGUAGE_OPTIONS: SelectOptionString[] = [
  { label: 'Español', value: 'es-ES' },
  { label: 'English', value: 'en-US' },
  //{ label: 'Français', value: 'fr-FR' },
];

@Component({
  selector: 'app-questionaire-edit',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTabsModule,
    MatCardModule,
    MatTooltipModule,
    MatSelectModule,
    EditableInput,
    RatingComponent,
    ColorPickerComponent,
    ImageFileComponent,
    AudioFileComponent,
    SliderComponent,
    OnOffToggleComponent,
    TranslatePipe,
    AsyncPipe,
  ],
  templateUrl: './questionaire-edit.html',
  styleUrl: './questionaire-edit.scss',
})
export class QuestionaireEditComponent {
  readonly minOptions = MIN_OPTIONS;
  readonly maxOptions = MAX_OPTIONS;
  readonly backgroundOptions = BACKGROUND_OPTIONS;
  readonly languageOptions = LANGUAGE_OPTIONS;
  readonly objectsOptions = OBJECTS_OPTIONS;
  readonly interactionOptions = INTERACTION_OPTIONS;
  private keydownSub: Subscription;
  stepsConfigForm: FormGroup;
  stepsForm: FormGroup;
  backgroundForm: FormGroup;
  audioFXForm: FormGroup;
  selectionObjectsForm: FormGroup;
  searchControl = new FormControl('');
  selectedTabLabel: string | null = 'Configuración';
  @ViewChildren(ImageFileComponent) images!: QueryList<ImageFileComponent>;
  @ViewChildren(AudioFileComponent) audios!: QueryList<AudioFileComponent>;
  imageConfig: ImageGalleryConfigDataType = {
    template: 'avatar/${user.uid}/${date.year}-${date.month}-${date.day}/backgrounds/${random}.jpg',
    thumbnailMaxSizePixels: 512,
    maxSizePixels: 2048,
    withThumbnail: true,
  };
  audioConfig: AudioDetailDataType = {
    template: 'avatar/${user.uid}/${date.year}-${date.month}-${date.day}/sounds/${random}',
    maxMb: 5,
  };
  sliderConfig: SliderDetailDataType = {
    min: 0,
    max: 100,
  };

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<QuestionaireEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GameScenario,
    public modalSrv: ModalService,
    public cdr: ChangeDetectorRef,
    public translateSrv: TranslateService,
    public confirmSrv: ConfirmDialogService,
  ) {
    this.stepsConfigForm = this.fb.group({
      language: [data.language ?? 'es-ES'],
      selectionObjects: [data.stepsConfig?.abcdType ?? 'cube'],
      introTitle: [data.stepsConfig?.introTitle ?? ''],
      looseLabel: [data.stepsConfig?.looseLabel ?? ''],
      winLabel: [data.stepsConfig?.winLabel ?? ''],
      includeProgress: [
        typeof data.stepsConfig?.includeProgress == 'boolean'
          ? data.stepsConfig.includeProgress
          : false,
      ],
      maxQuestions: [data.stepsConfig?.maxQuestions ?? null],
    });
    this.stepsForm = this.fb.group({
      steps: this.fb.array((data.steps ?? []).map((step) => this.buildStepGroup(step))),
    });
    this.backgroundForm = this.fb.group({
      type: [data.background?.type ?? null],
      color: [data.background?.color ?? { ...DEFAULT_BACKGROUND_COLOR }],
      image: [data.background?.image ?? DEFAULT_BACKGROUND_IMAGE],
    });
    this.audioFXForm = this.fb.group({
      audioIntro: [data.audio?.intro ?? null],
      audioFinish: [data.audio?.finish ?? null],
      audioLoop: [data.audio?.loop ?? null],
      audioSuccess: [data.audio?.success ?? null],
      audioLoose: [data.audio?.loose ?? null],
    });
    this.selectionObjectsForm = this.fb.group({
      shiftX: [data.stepsConfig?.selectionObjects?.shiftX ?? 0],
      offsetX: [data.stepsConfig?.selectionObjects?.offsetX ?? 70],
      shiftY: [data.stepsConfig?.selectionObjects?.shiftY ?? 0],
      offsetYUp: [data.stepsConfig?.selectionObjects?.offsetYUp ?? 40],
      offsetYDown: [data.stepsConfig?.selectionObjects?.offsetYDown ?? 90],
      rotate: [data.stepsConfig?.selectionObjects?.rotate ?? false],
      rotateMinSpeed: [data.stepsConfig?.selectionObjects?.rotateMinSpeed ?? 0],
      rotateAditionalSpeed: [data.stepsConfig?.selectionObjects?.rotateAditionalSpeed ?? 0],
      randomOrder: [data.stepsConfig?.selectionObjects?.randomOrder ?? false],
      interaction: [data.stepsConfig?.interaction ?? "custom"],
    });
    this.keydownSub = this.dialogRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.cancel();
      }
    });
    translateSelectOptions(
      'avatar',
      this.backgroundOptions,
      this.cdr,
      this.translateSrv,
      'popup.questionaire.tabs.background.type.',
    );
    translateSelectOptions(
      'avatar',
      this.objectsOptions,
      this.cdr,
      this.translateSrv,
      'popup.questionaire.tabs.objects.',
    );
    translateSelectOptions(
      'avatar',
      this.interactionOptions,
      this.cdr,
      this.translateSrv,
      'popup.questionaire.tabs.interaction.',
    );
  }

  get steps(): FormArray {
    return this.stepsForm.get('steps') as FormArray;
  }

  getOptions(stepIndex: number): FormArray {
    return this.steps.at(stepIndex).get('options') as FormArray;
  }

  canAddOption(stepIndex: number): boolean {
    return this.getOptions(stepIndex).length < this.maxOptions;
  }

  canRemoveOption(stepIndex: number): boolean {
    return this.getOptions(stepIndex).length > this.minOptions;
  }

  matchesSearch(stepIndex: number): boolean {
    const query = this.searchControl.value;
    if (!query?.trim()) {
      return true;
    }
    const step = this.steps.at(stepIndex).value;
    if (this.textIncludes(step.label, query)) {
      return true;
    }
    return (step.options ?? []).some(
      (option: GameStepOption) =>
        this.textIncludes(option.label, query) || this.textIncludes(option.answer, query),
    );
  }

  clearSearch(): void {
    this.searchControl.setValue('');
  }

  onTabChange(event: MatTabChangeEvent): void {
    this.selectedTabLabel = event.tab.id;
  }

  private textIncludes(haystack?: string | null, needle?: string | null): boolean {
    return this.normalizeText(haystack).includes(this.normalizeText(needle));
  }

  private normalizeText(value?: string | null): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  hasVisibleSteps(): boolean {
    return this.steps.controls.some((_, index) => this.matchesSearch(index));
  }

  addStep(): void {
    this.steps.push(this.buildStepGroup());
  }

  async removeStep(stepIndex: number): Promise<void> {
    // ask confirm
    const confirm = await this.confirmSrv.confirm({
      title: 'confirm.sure',
      message: 'confirm.erase_cant_undo',
      langFolder: 'general',
    });
    if (!confirm) {
      return;
    }
    this.steps.removeAt(stepIndex);
    this.cdr.detectChanges();
  }

  addOption(stepIndex: number): void {
    if (!this.canAddOption(stepIndex)) {
      return;
    }
    this.getOptions(stepIndex).push(this.buildOptionGroup());
  }

  async removeOption(stepIndex: number, optionIndex: number): Promise<void> {
    // ask confirm
    const confirm = await this.confirmSrv.confirm({
      title: 'confirm.sure',
      message: 'confirm.erase_cant_undo',
      langFolder: 'general',
    });
    if (!confirm) {
      return;
    }
    if (!this.canRemoveOption(stepIndex)) {
      return;
    }
    this.getOptions(stepIndex).removeAt(optionIndex);
  }

  private buildStepGroup(step?: GameStep): FormGroup {
    const options = step?.options?.length ? step.options : [undefined];
    return this.fb.group({
      label: [step?.label ?? '', Validators.required],
      options: this.fb.array(options.map((option) => this.buildOptionGroup(option))),
    });
  }

  private buildOptionGroup(option?: GameStepOption): FormGroup {
    return this.fb.group({
      label: [option?.label ?? '', Validators.required],
      points: [option?.points ?? 0, Validators.required],
      answer: [option?.answer ?? ''],
    });
  }

  private toNumber(value: any): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const parsed = Number(value);
    return isNaN(parsed) ? undefined : parsed;
  }

  async syncIfNeeded() {
    const temp: ComponentBucketField[] = [];
    this.images.forEach((el) => {
      temp.push(el);
    });
    this.audios.forEach((el) => {
      temp.push(el);
    });
    for (let i = 0; i < temp.length; i++) {
      await temp[i].syncIfNeeded();
    }
  }

  async save(): Promise<void> {
    if (this.stepsConfigForm.invalid || this.stepsForm.invalid || this.backgroundForm.invalid) {
      this.stepsConfigForm.markAllAsTouched();
      this.stepsForm.markAllAsTouched();
      this.backgroundForm.markAllAsTouched();
      this.audioFXForm.markAllAsTouched();
      this.selectionObjectsForm.markAllAsTouched();
      return;
    }

    await this.syncIfNeeded();

    const backgroundValue = this.backgroundForm.value;
    this.data.background = {
      ...this.data.background,
      type: backgroundValue.type ?? undefined,
      color: backgroundValue.type === 'color' ? backgroundValue.color : this.data.background?.color,
      image: backgroundValue.type === 'image' ? backgroundValue.image : this.data.background?.image,
    };

    const configValue = this.stepsConfigForm.value;
    this.data.stepsConfig = {
      introTitle: configValue.introTitle || undefined,
      looseLabel: configValue.looseLabel || undefined,
      winLabel: configValue.winLabel || undefined,
      includeProgress:
        typeof configValue.includeProgress == 'boolean' ? configValue.includeProgress : false,
      maxQuestions: this.toNumber(configValue.maxQuestions),
      abcdType: configValue.selectionObjects || undefined,
    };
    this.data.language = configValue.language ?? 'es-ES';

    this.data.steps = this.steps.value.map((step: GameStep) => ({
      label: step.label,
      options: step.options.map((option: GameStepOption) => ({
        label: option.label,
        answer: option.answer,
        points: this.toNumber(option.points) ?? 0,
      })),
    }));

    const soundsFXValue = this.audioFXForm.value;
    this.data.audio = {
      intro: soundsFXValue.audioIntro || undefined,
      loop: soundsFXValue.audioLoop || undefined,
      finish: soundsFXValue.audioFinish || undefined,
      success: soundsFXValue.audioSuccess || undefined,
      loose: soundsFXValue.audioLoose || undefined,
    };

    const selectionObjectsValue = this.selectionObjectsForm.value;

    if (selectionObjectsValue.interaction == "stand") {
      selectionObjectsValue.shiftX = 50;
      selectionObjectsValue.offsetX = 70;
      selectionObjectsValue.shiftY = 50;
      selectionObjectsValue.offsetYUp = 40;
      selectionObjectsValue.offsetYDown = 90;
    } else if (selectionObjectsValue.interaction == "sit") {
      selectionObjectsValue.shiftX = 0;
      selectionObjectsValue.offsetX = 50;
      selectionObjectsValue.shiftY = 15;
      selectionObjectsValue.offsetYUp = 40;
      selectionObjectsValue.offsetYDown = 15;
    }

    this.data.stepsConfig.selectionObjects = {
      shiftX: selectionObjectsValue.shiftX,
      offsetX: selectionObjectsValue.offsetX,
      shiftY: selectionObjectsValue.shiftY,
      offsetYUp: selectionObjectsValue.offsetYUp,
      offsetYDown: selectionObjectsValue.offsetYDown,
      rotate: selectionObjectsValue.rotate,
      rotateMinSpeed: selectionObjectsValue.rotateMinSpeed,
      rotateAditionalSpeed: selectionObjectsValue.rotateAditionalSpeed,
      randomOrder: selectionObjectsValue.randomOrder,
    };

    this.data.stepsConfig.interaction = selectionObjectsValue.interaction;

    this.dialogRef.close(this.data);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  async exportQuestions() {
    const steps = this.data.steps;
    ClipboardUtil.writeText(JSON.stringify(steps, null, 4));
    this.modalSrv.alert({
      title: 'alerts.clipboard_copy.title',
      txt: 'alerts.clipboard_copy.txt',
      translateFolder: 'avatar',
    });
  }

  async importQuestions() {
    //
    try {
      const text = await ClipboardUtil.readText();
      if (!text) {
        throw new Error('No hay nada en el portapapeles');
      }
      let steps: GameStep[] = [];
      try {
        steps = JSON.parse(text);
      } catch (err1) {
        throw new Error('La información del portapapeles no tiene el formato esperado');
      }
      this.stepsForm = this.fb.group({
        steps: this.fb.array((steps ?? []).map((step) => this.buildStepGroup(step))),
      });
      this.data.steps = steps;
      this.cdr.detectChanges();
      this.modalSrv.alert({
        title: 'alerts.done.title',
        txt: 'alerts.done.txt',
        translateFolder: 'avatar',
      });
    } catch (err: any) {
      this.modalSrv.alert({
        title: 'Ups',
        txt: err.message,
      });
    }
  }

  ngOnDestroy() {
    this.keydownSub.unsubscribe();
  }
}
