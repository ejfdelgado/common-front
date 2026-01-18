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

export type OnOffDataType = number | null;

@Component({
  selector: 'app-rating',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './rating.html',
  styleUrls: ['./rating.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RatingComponent),
      multi: true
    }
  ]
})
export class RatingComponent implements ControlValueAccessor {

  @Input() onImageUrl: string = "./assets/icons/star_on.svg";
  @Input() offImageUrl: string = "./assets/icons/star_off.svg";
  @Input() label: string = "Añadir a favorito";
  value: OnOffDataType = 0;
  disabled = false;

  /* ========= ControlValueAccessor API ========= */

  private onChange: (value: OnOffDataType) => void = () => { };
  private onTouched: () => void = () => { };

  writeValue(value: OnOffDataType | null): void {
    this.value = value;
  }

  registerOnChange(fn: (value: OnOffDataType) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  /* ========= Component Logic ========= */

  clickRate(value: OnOffDataType): void {
    if (this.disabled) return;

    this.value = value;
    this.onChange(this.value);
    this.onTouched();
  }
}
