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
import { ImageDetailDataType } from '@components/dialog-form/dialog-form.component';
import { FileService } from '@services/file.srv';
import { GoogleAuthService } from '@services/google-auth.service';
import { getBucketPath } from '@tools/BucketPaths';
import { ComponentBucketField } from 'app/types/ComponentBucketField';
import { environment } from 'environments/environment';

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
export class ImageFileComponent implements ControlValueAccessor, OnDestroy, ComponentBucketField {
  @Input() label: string = "";
  @Input() config: ImageDetailDataType | undefined = {
    template: "default/${random}/image.jpg",
  };
  value: ComponentDataType = null;
  disabled = false;
  temporalUrl: string | null = null;
  lastBlob: Blob | null = null;

  constructor(
    private fileSrv: FileService,
    public cdr: ChangeDetectorRef,
    public authSrv: GoogleAuthService,
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
      if (this.temporalUrl) {
        return this.temporalUrl;
      }
      return `https://storage.googleapis.com/${environment.DEFAULT_BUCKET}/${this.value}`;
    }
  }

  /* ========= Component Logic ========= */

  async clickEdit(): Promise<void> {
    if (this.disabled || !this.config) return;

    const blob = await this.fileSrv.openCamera();
    if (!blob) {
      return;
    }

    // In the middle we can edit image in canvas, then create the blob url
    const nextPath = getBucketPath(this.config.template, this.value ? this.value : "", {
      user: GoogleAuthService.userStatic,
    });

    this.value = nextPath;
    this.assignBlobUrl(blob);
    this.onChange(this.value);
    this.onTouched();
    this.cdr.detectChanges();
  }

  assignBlobUrl(blob: Blob) {
    this.destroyBlobUrl();
    this.lastBlob = blob;
    this.temporalUrl = URL.createObjectURL(blob);
  }

  destroyBlobUrl() {
    if (this.temporalUrl) {
      URL.revokeObjectURL(this.temporalUrl);
    }
  }

  ngOnDestroy() {
    if (this.temporalUrl) {
      URL.revokeObjectURL(this.temporalUrl);
    }
  }

  async syncIfNeeded() {
    if (this.lastBlob && this.value) {
      await this.fileSrv.upload(this.value.split("?")[0], this.lastBlob, "bucket");
      this.destroyBlobUrl();
    }
  }
}
