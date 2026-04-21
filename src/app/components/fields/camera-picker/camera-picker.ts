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
import { FullscreenService } from '@services/fullscreen.service';
import { CameraPickerDialogComponent } from './camera-picker-dialog';

export interface CameraDataType {
  id: string;
  name: string;
}

@Component({
  selector: 'app-camera-picker',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './camera-picker.html',
  styleUrl: './camera-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CameraPicker),
      multi: true,
    },
  ],
})
export class CameraPicker extends CommonComponent implements ControlValueAccessor {
  @Input() label: string = 'Camera';

  value: CameraDataType | null = null;
  disabled = false;

  constructor(
    public cdr: ChangeDetectorRef,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    private dialog: MatDialog,
  ) {
    super(sanitizer, fullScreenSrv);
  }

  writeValue(value: CameraDataType | null): void {
    this.value = value;
    this.cdr.markForCheck();
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  openPicker() {
    if (this.disabled) return;

    const ref = this.dialog.open(CameraPickerDialogComponent, {
      data: { currentCamera: this.value },
      disableClose: true,
      width: '480px',
    });

    ref.afterClosed().subscribe((result: CameraDataType | null) => {
      if (result) {
        this.value = result;
        this.onChange(result);
        this.onTouched();
        this.cdr.markForCheck();
      }
    });
  }
}
