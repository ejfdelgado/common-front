import { Component, Inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GameScenario, GameStep, GameStepOption, StepsConfig } from 'src/types/WorldAvatar';
import { EditableInput } from 'src/app/components/fields/editable-input/editable-input';
import { RatingComponent } from 'src/app/components/fields/rating/rating';
import { SelectOptionString } from 'src/types/fieldsTypes';

const MIN_OPTIONS = 1;
const MAX_OPTIONS = 4;

const BACKGROUND_OPTIONS: SelectOptionString[] = [
  { label: 'Imagen', value: "image" },
  { label: 'Color', value: "color" },
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
    EditableInput,
    RatingComponent,
  ],
  templateUrl: './questionaire-edit.html',
  styleUrl: './questionaire-edit.scss',
})
export class QuestionaireEditComponent {

  readonly minOptions = MIN_OPTIONS;
  readonly maxOptions = MAX_OPTIONS;

  stepsConfigForm: FormGroup;
  stepsForm: FormGroup;
  searchControl = new FormControl('');

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<QuestionaireEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GameScenario
  ) {
    this.stepsConfigForm = this.buildStepsConfigForm(data.stepsConfig);
    this.stepsForm = this.fb.group({
      steps: this.fb.array((data.steps ?? []).map((step) => this.buildStepGroup(step))),
    });
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
    return (step.options ?? []).some((option: GameStepOption) =>
      this.textIncludes(option.label, query) || this.textIncludes(option.answer, query)
    );
  }

  clearSearch(): void {
    this.searchControl.setValue('');
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

  removeStep(stepIndex: number): void {
    this.steps.removeAt(stepIndex);
  }

  addOption(stepIndex: number): void {
    if (!this.canAddOption(stepIndex)) {
      return;
    }
    this.getOptions(stepIndex).push(this.buildOptionGroup());
  }

  removeOption(stepIndex: number, optionIndex: number): void {
    if (!this.canRemoveOption(stepIndex)) {
      return;
    }
    this.getOptions(stepIndex).removeAt(optionIndex);
  }

  private buildStepsConfigForm(config?: StepsConfig): FormGroup {
    return this.fb.group({
      introTitle: [config?.introTitle ?? ''],
      looseLabel: [config?.looseLabel ?? ''],
      winLabel: [config?.winLabel ?? ''],
      maxQuestions: [config?.maxQuestions ?? null],
    });
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

  save(): void {
    if (this.stepsConfigForm.invalid || this.stepsForm.invalid) {
      this.stepsConfigForm.markAllAsTouched();
      this.stepsForm.markAllAsTouched();
      return;
    }

    const configValue = this.stepsConfigForm.value;
    this.data.stepsConfig = {
      introTitle: configValue.introTitle || undefined,
      looseLabel: configValue.looseLabel || undefined,
      winLabel: configValue.winLabel || undefined,
      maxQuestions: this.toNumber(configValue.maxQuestions),
    };

    this.data.steps = this.steps.value.map((step: GameStep) => ({
      label: step.label,
      options: step.options.map((option: GameStepOption) => ({
        label: option.label,
        answer: option.answer,
        points: this.toNumber(option.points) ?? 0,
      })),
    }));

    this.dialogRef.close(this.data);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
