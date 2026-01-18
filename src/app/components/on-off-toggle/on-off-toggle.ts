import {
  Component,
  forwardRef,
  ChangeDetectionStrategy
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR
} from '@angular/forms';

export type OnOffDataType = 'on' | 'off';

@Component({
  selector: 'app-on-off-toggle',
  standalone: true,
  imports: [

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

  value: OnOffDataType = 'off';
  disabled = false;

  /* ========= ControlValueAccessor API ========= */

  private onChange: (value: OnOffDataType) => void = () => { };
  private onTouched: () => void = () => { };

  writeValue(value: OnOffDataType | null): void {
    if (value === 'on' || value === 'off') {
      this.value = value;
    }
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

    this.value = this.value === 'on' ? 'off' : 'on';
    this.onChange(this.value);
    this.onTouched();
  }
}
