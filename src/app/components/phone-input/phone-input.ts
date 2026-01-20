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

  @Input() prefixes: string[] = ['+1', '+34', '+44', '+57'];

  value: PhoneValue = {
    prefix: '',
    number: ''
  };

  disabled = false;

  private onChange: (value: PhoneValue) => void = () => { };
  private onTouched: () => void = () => { };

  writeValue(value: PhoneValue | null): void {
    if (value) {
      this.value = { ...value };
    } else {
      this.value = { prefix: '', number: '' };
    }
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

