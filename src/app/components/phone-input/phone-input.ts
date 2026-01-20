import {
  Component,
  forwardRef,
  Input
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

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
    }
  ]
})
export class PhoneInputComponent implements ControlValueAccessor {

  @Input() label = 'Phone number';
  @Input() prefixes: string[] = ['+1', '+57'];

  value: PhoneValue = {
    prefix: '+57',
    number: ''
  };

  disabled = false;

  private onChange: (value: PhoneValue) => void = () => { };
  private onTouched: () => void = () => { };

  writeValue(value: PhoneValue | null): void {
    this.value = value
      ? { ...value }
      : { prefix: '', number: '' };
  }

  registerOnChange(fn: (value: PhoneValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  update(): void {
    this.onChange({ ...this.value });
    this.onTouched();
  }
}
