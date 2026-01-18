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

export type OnOffDataType = boolean;

@Component({
  selector: 'app-on-off-toggle',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './on-off-toggle.html',
  styleUrls: ['./on-off-toggle.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => OnOffToggleComponent),
      multi: true
    }
  ]
})
export class OnOffToggleComponent implements ControlValueAccessor {

  @Input() onImageUrl: string = "./assets/icons/heart.svg";
  @Input() offImageUrl: string = "./assets/icons/heart_off.svg";
  @Input() label: string = "Añadir a favorito";
  value: OnOffDataType = false;
  disabled = false;

  /* ========= ControlValueAccessor API ========= */

  private onChange: (value: OnOffDataType) => void = () => { };
  private onTouched: () => void = () => { };

  writeValue(value: OnOffDataType | null): void {
    this.value = !!value;
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

  toggle(): void {
    if (this.disabled) return;

    this.value = !this.value;
    this.onChange(this.value);
    this.onTouched();
  }
}
