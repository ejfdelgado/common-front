import { CommonModule } from '@angular/common';
import {
  Component,
  forwardRef,
  ChangeDetectionStrategy,
  Input,
  ChangeDetectorRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonComponent } from '@components/common.component';
import { FullscreenService } from '@services/fullscreen.service';

export type OnOffDataType = number | null;

@Component({
  selector: 'app-rating',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rating.html',
  styleUrls: ['./rating.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RatingComponent),
      multi: true,
    },
  ],
})
export class RatingComponent extends CommonComponent implements ControlValueAccessor {
  @Input() onImageUrl: string = './assets/icons/star.svg';
  @Input() offImageUrl: string = './assets/icons/star_off.svg';
  @Input() label: string = 'Añadir a favorito';
  value: OnOffDataType = 0;
  disabled = false;
  isShaking: boolean = false;
  timeoutRef: NodeJS.Timeout | null = null;

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
    this.shake();
    try {
      this.cdr.detectChanges();
    } catch (err) {}
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  shake() {
    this.isShaking = true;
    if (this.timeoutRef) {
      return;
    }
    //this.cdr.detectChanges();
    this.timeoutRef = setTimeout(() => {
      this.isShaking = false;
      this.cdr.detectChanges();
      if (this.timeoutRef) {
        this.timeoutRef = null;
      }
    }, 2000);
  }

  clickRate(value: OnOffDataType): void {
    if (this.disabled) return;
    // Toggle effect
    if (this.value == value) {
      this.value = 0;
    } else {
      this.value = value;
    }
    this.shake();
    this.onChange(this.value);
    this.onTouched();
  }
}
