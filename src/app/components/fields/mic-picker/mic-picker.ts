import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonComponent } from '@components/common.component';
import { MicDataType } from '@mytypes/CameraTypes';
import { ConfigService } from '@services/config.service';
import { FullscreenService } from '@services/fullscreen.service';

@Component({
  selector: 'app-mic-picker',
  imports: [],
  templateUrl: './mic-picker.html',
  styleUrl: './mic-picker.scss',
})
export class MicPicker extends CommonComponent implements ControlValueAccessor {
  @Input() label: string = 'Mic';

  constructor(
    public cdr: ChangeDetectorRef,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    private dialog: MatDialog,
    public configSrv: ConfigService,
  ) {
    super(sanitizer, fullScreenSrv);
  }

  writeValue(obj: MicDataType | null): void {
    throw new Error('Method not implemented.');
  }
  setDisabledState?(isDisabled: boolean): void {
    throw new Error('Method not implemented.');
  }

}
