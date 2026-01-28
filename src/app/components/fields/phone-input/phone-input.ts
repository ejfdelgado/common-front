import {
  ChangeDetectorRef,
  Component,
  forwardRef,
  Input,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  NG_VALIDATORS,
  Validator,
  AbstractControl,
  ValidationErrors,
  FormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { CommonComponent } from '@components/common.component';
import { DomSanitizer } from '@angular/platform-browser';

export interface PhoneValue {
  prefix: string;
  number: string;
}

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule
  ],
  templateUrl: './phone-input.html',
  styleUrls: ['./phone-input.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true
    }
  ]
})
export class PhoneInputComponent extends CommonComponent
  implements ControlValueAccessor, Validator {

  @Input() label = 'Phone number';
  @Input() isRequired: boolean | undefined = false;
  @Input() prefixes: string[] = ['+1', '+57'];

  value: PhoneValue = {
    prefix: '+57',
    number: ''
  };

  disabled = false;
  touched = false;

  constructor(
    public cdr: ChangeDetectorRef,
    public override sanitizer: DomSanitizer,
  ) {
    super(sanitizer);
  }

  private onValidatorChange: () => void = () => { };

  private readonly phoneRegex = /^\d{10}$/;

  writeValue(value: PhoneValue | null): void {
    this.value = value
      ? { ...value }
      : { prefix: '', number: '' };
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  update(): void {
    this.onChange({ ...this.value });
    this.markAsTouched();
    this.onValidatorChange();
  }

  latestErrors: { [key: string]: boolean } | null = {};

  validate(_: AbstractControl): ValidationErrors | null {
    this.latestErrors = {};

    if (!this.value.number || !this.value.prefix) {
      if (this.isRequired !== true) {
        return this.latestErrors;
      }
      this.latestErrors = { required: true };
      //this.cdr.detectChanges();
      return this.latestErrors;
    }

    if (!this.phoneRegex.test(this.value.number)) {
      this.latestErrors = { invalidPhone: true };
      //this.cdr.detectChanges();
      return this.latestErrors;
    }

    this.latestErrors = null;
    //this.cdr.detectChanges();
    return this.latestErrors;
  }

  hasError(key: string) {
    return this.latestErrors ? this.latestErrors[key] === true : false;
  }

  private markAsTouched(): void {
    if (!this.touched) {
      this.touched = true;
      this.onTouched();
    }
  }
}
