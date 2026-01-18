import { CommonModule } from '@angular/common';
import {
  Component,
  forwardRef,
  ChangeDetectionStrategy,
  Input
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR
} from '@angular/forms';

export type ComponentDataType = string | null;

@Component({
  selector: 'app-image-field',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './image-field.html',
  styleUrls: ['./image-field.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImageFileComponent),
      multi: true
    }
  ]
})
export class ImageFileComponent implements ControlValueAccessor {
  @Input() label: string = "";
  value: ComponentDataType = null;
  disabled = false;

  /* ========= ControlValueAccessor API ========= */

  private onChange: (value: ComponentDataType) => void = () => { };
  private onTouched: () => void = () => { };

  writeValue(value: ComponentDataType | null): void {
    this.value = value;
  }

  registerOnChange(fn: (value: ComponentDataType) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  getImageUrl() {
    if (!this.value) {
      return "./assets/img/default.jpeg";
    } else {
      return this.value;
    }
  }

  /* ========= Component Logic ========= */

  clickEdit(): void {

  }
}
