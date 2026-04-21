import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  forwardRef,
  Input,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonComponent } from '@components/common.component';
import { MicDataType } from '@mytypes/CameraTypes';
import { ConfigService } from '@services/config.service';
import { FullscreenService } from '@services/fullscreen.service';
import { MicPickerDialogComponent } from './mic-picker-dialog';

@Component({
  selector: 'app-mic-picker',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './mic-picker.html',
  styleUrl: './mic-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MicPicker),
      multi: true,
    },
  ],
})
export class MicPicker extends CommonComponent implements ControlValueAccessor {
  @Input() label: string = 'Mic';

  value: MicDataType | null = null;
  disabled = false;

  constructor(
    public cdr: ChangeDetectorRef,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    private dialog: MatDialog,
    public configSrv: ConfigService,
  ) {
    super(sanitizer, fullScreenSrv);
  }

  writeValue(value: MicDataType | null): void {
    this.value = value;
    this.cdr.markForCheck();
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  openPicker() {
    if (this.disabled) return;

    const ref = this.dialog.open(MicPickerDialogComponent, {
      data: { currentMic: this.value },
      disableClose: true,
      width: '480px',
    });

    ref.afterClosed().subscribe((result: MicDataType | null) => {
      if (result) {
        this.value = result;
        this.onChange(result);
        this.onTouched();
        this.cdr.markForCheck();
      }
    });
  }
}
