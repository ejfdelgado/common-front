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
import { DomSanitizer } from '@angular/platform-browser';
import { CommonComponent } from '@components/common.component';
import { AuthService } from '@services/auth.service';
import { FileService } from '@services/file.srv';
import { getBucketPath, getSquarePath, getThumbnailPath } from '@tools/BucketPaths';
import { environment } from 'environments/environment';
import { ComponentBucketField } from 'types/ComponentBucketField';
import { ImageDetailDataType } from 'types/fieldsTypes';
import { UploadResponse } from 'types/file';

export type ComponentDataType = string | null;

const maxSizePixels = 2048;
const thumbnailMaxSizePixels = 1024;
const squareMaxSizePixels = 1024;

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
export class ImageFileComponent extends CommonComponent implements ControlValueAccessor, OnDestroy, ComponentBucketField {
  @Input() label: string = "";
  @Input() config!: ImageDetailDataType;
  value: ComponentDataType = null;
  disabled = false;
  temporalUrl: string | null = null;
  lastBlob: Blob | null = null;


  constructor(
    private fileSrv: FileService,
    public cdr: ChangeDetectorRef,
    public authSrv: AuthService,
    public override sanitizer: DomSanitizer,
  ) {
    super(sanitizer);
  }

  /* ========= ControlValueAccessor API ========= */


  writeValue(value: ComponentDataType | null): void {
    this.value = value;
    this.cdr.detectChanges();
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

  async askForEdit(type: "photo" | "file"): Promise<void> {
    if (this.disabled || !this.config) return;

    let blob: Blob | undefined = undefined;

    if (type == "photo") {
      blob = await this.fileSrv.openCamera();
    } else if (type = "file") {
      blob = await this.fileSrv.pickImageFile();
    }

    if (!blob) {
      return;
    }

    // Assure max images size
    const side = this.config.maxSizePixels ? this.config.maxSizePixels : maxSizePixels;
    const resizedBlob = await this.fileSrv.resizeImageBlob(
      blob,
      side,
      side,
      'image/jpeg',
      0.9
    );

    // TODO In the middle we can edit image in canvas, then create the blob url
    const nextPath = getBucketPath(this.config.template, this.value ? this.value : "", {
      user: AuthService.userStatic,
    });

    this.value = nextPath;
    this.assignBlobUrl(resizedBlob);
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
      // Create thumbnail
      const side = this.config?.thumbnailMaxSizePixels ? this.config.thumbnailMaxSizePixels : thumbnailMaxSizePixels;
      const sideSquare = this.config?.squareMaxSizePixels ? this.config.squareMaxSizePixels : squareMaxSizePixels;
      const thumbnailBlob = await this.fileSrv.resizeImageBlob(
        this.lastBlob,
        side,
        side,
        'image/jpeg',
        0.9
      );
      const squaredBlob = await this.fileSrv.squareImageCover(
        this.lastBlob,
        sideSquare,
        'image/jpeg',
        0.9
      );
      const rawFileName = this.value.split("?")[0];
      const promesas: Promise<UploadResponse>[] = [];
      promesas.push(this.fileSrv.upload(getThumbnailPath(rawFileName), thumbnailBlob, "bucket"));
      promesas.push(this.fileSrv.upload(getSquarePath(rawFileName), squaredBlob, "bucket"));
      promesas.push(this.fileSrv.upload(rawFileName, this.lastBlob, "bucket"));
      await Promise.all(promesas);
      this.destroyBlobUrl();
    }
  }
}
