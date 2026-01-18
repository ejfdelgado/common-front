import { CommonModule } from '@angular/common';
import {
  Component,
  forwardRef,
  ChangeDetectionStrategy,
  Input,
  ChangeDetectorRef,
  OnDestroy
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { FileService } from '@services/file.srv';

export type ComponentDataType = string | null;

@Component({
  selector: 'app-image-field',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIcon,
  ],
  templateUrl: './image-field.html',
  styleUrls: ['./image-field.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImageFileComponent),
      multi: true
    }
  ]
})
export class ImageFileComponent implements ControlValueAccessor, OnDestroy {
  @Input() label: string = "";
  value: ComponentDataType = null;
  disabled = false;
  temporalUrl: string | null = null;

  constructor(
    private fileSrv: FileService,
    public cdr: ChangeDetectorRef,
  ) {

  }

  /* ========= ControlValueAccessor API ========= */

  private onChange: (value: ComponentDataType) => void = () => { };
  private onTouched: () => void = () => { };

  writeValue(value: ComponentDataType | null): void {
    this.value = value;
  }

  registerOnChange(fn: (value: ComponentDataType) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  getImageUrl() {
    if (!this.value) {
      return "./assets/img/default.jpeg";
    } else {
      return this.value;
    }
  }

  /* ========= Component Logic ========= */

  async clickEdit(): Promise<void> {
    if (this.disabled) return;

    const blob = await this.fileSrv.openCamera();
    if (!blob) {
      return;
    }

    // In the middle we can edit image in canvas, then create the blob url

    this.value = URL.createObjectURL(blob);
    this.assignBlobUrl(this.value);
    this.onChange(this.value);
    this.onTouched();
    this.cdr.detectChanges();
  }

  assignBlobUrl(url: string) {
    this.destroyBlobUIrl();
    this.temporalUrl = url;
  }

  destroyBlobUIrl() {
    if (this.temporalUrl) {
      URL.revokeObjectURL(this.temporalUrl);
    }
  }

  ngOnDestroy() {
    if (this.temporalUrl) {
      URL.revokeObjectURL(this.temporalUrl);
    }
  }

  async upload(blob: Blob) {
    try {
      const response = await this.fileSrv.upload("prueba/archivo.jpg", blob, "bucket");
    } catch (err) { }
  }
}
