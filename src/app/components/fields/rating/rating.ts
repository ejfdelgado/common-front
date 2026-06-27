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
import { FullscreenService } from '@services/fullscreen.service';

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
export class RatingComponent extends CommonComponent implements ControlValueAccessor {

  @Input() onImageUrl: string = "./assets/icons/star.svg";
  @Input() offImageUrl: string = "./assets/icons/star_off.svg";
  @Input() label: string = "Añadir a favorito";
  value: OnOffDataType = 0;
  disabled = false;

  constructor(
    public cdr: ChangeDetectorRef,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
  ) {
    super(sanitizer, fullScreenSrv);
  }

  /* ========= ControlValueAccessor API ========= */

  writeValue(value: OnOffDataType | null): void {
    this.value = value;
    try {
      this.cdr.detectChanges();
    } catch (err) { }
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
