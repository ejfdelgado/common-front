import { CommonModule } from '@angular/common';
import {
  Component,
  forwardRef,
  ChangeDetectionStrategy,
  Input,
  ChangeDetectorRef
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR
} from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonComponent } from '@components/common.component';
import { SliderDetailDataType } from '@mytypes/fieldsTypes';
import { FullscreenService } from '@services/fullscreen.service';

export type SliderDataType = number | null;

@Component({
  selector: 'app-slider',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './slider.html',
  styleUrls: ['./slider.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SliderComponent),
      multi: true
    }
  ]
})
export class SliderComponent extends CommonComponent implements ControlValueAccessor {

  @Input() label: string = "Value";
  @Input() config!: SliderDetailDataType;
  value: SliderDataType = 0;
  disabled = false;

  constructor(
    public cdr: ChangeDetectorRef,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
  ) {
    super(sanitizer, fullScreenSrv);
  }

  writeValue(value: SliderDataType | null): void {
    this.value = value;
    try {
      this.cdr.detectChanges();
    } catch (err) { }
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onSliderChange(event: Event): void {
    if (this.disabled) return;
    const input = event.target as HTMLInputElement;
    this.value = Number(input.value);
    this.onChange(this.value);
    this.onTouched();
  }
}
