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
export class OnOffToggleComponent extends CommonComponent implements ControlValueAccessor {

  @Input() iconName: string = "heart";
  @Input() label: string = "Añadir a favorito";
  value: OnOffDataType = false;
  disabled = false;

  constructor(
    public cdr: ChangeDetectorRef,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
  ) {
    super(sanitizer, fullScreenSrv);
  }

  /* ========= ControlValueAccessor API ========= */

  get onImageUrl() {
    return `./assets/icons/${this.iconName}.svg`;
  }

  get offImageUrl() {
    return `./assets/icons/${this.iconName}_off.svg`;
  }

  writeValue(value: OnOffDataType | null): void {
    this.value = !!value;
    try {
      this.cdr.detectChanges();
    } catch (err) { }
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
