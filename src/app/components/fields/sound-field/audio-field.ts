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
import { FullscreenService } from '@services/fullscreen.service';
import { getBucketPath, getSquarePath, getThumbnailPath } from '@tools/BucketPaths';
import { environment } from 'environments/environment';
import { ConfirmDialogService } from 'src/app/services/confirm-dialog.service';
import { ComponentBucketField } from 'types/ComponentBucketField';
import { AudioDetailDataType } from 'types/fieldsTypes';
import { UploadResponse } from 'types/file';

export type ComponentDataType = string | null;

@Component({
  selector: 'app-audio-field',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIcon,
  ],
  templateUrl: './audio-field.html',
  styleUrls: ['./audio-field.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AudioFileComponent),
      multi: true
    }
  ]
})
export class AudioFileComponent extends CommonComponent implements ControlValueAccessor, OnDestroy, ComponentBucketField {
  @Input() label: string = "";
  @Input() config!: AudioDetailDataType;
  value: ComponentDataType = null;
  disabled = false;
  temporalUrl: string | null = null;
  lastBlob: Blob | null = null;


  constructor(
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
    // Own services
    private fileSrv: FileService,
    public cdr: ChangeDetectorRef,
    public authSrv: AuthService,
    public confirmSrv: ConfirmDialogService,
  ) {
    super(sanitizer, fullScreenSrv);
  }

  /* ========= ControlValueAccessor API ========= */


  writeValue(value: ComponentDataType | null): void {
    this.value = value;
    this.cdr.detectChanges();
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  getAudioUrl() {
    if (!this.value) {
      return null;
    } else {
      if (this.temporalUrl) {
        return this.temporalUrl;
      }
      return `https://storage.googleapis.com/${environment.DEFAULT_BUCKET}/${this.value}`;
    }
  }

  /* ========= Component Logic ========= */

  async askForEdit(): Promise<void> {
    if (this.disabled || !this.config) return;

    let blob: Blob | undefined = undefined;

    blob = await this.fileSrv.pickAudioFile();

    if (!blob) {
      return;
    }

    const nextPath = getBucketPath(this.config.template, this.value ? this.value : "", {
      user: AuthService.userStatic,
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

  async eraseBlob() {
    const confirm = await this.confirmSrv.confirm({
      title: "Está seguro?",
      message: "Al borrar no se podrá deshacer",
    });
    if (!confirm) {
      return;
    }
    this.destroyBlobUrl();
    this.lastBlob = null;
    this.temporalUrl = null;

    this.value = null;
    this.onChange(this.value);
    this.onTouched();
    this.cdr.detectChanges();
  }

  destroyBlobUrl() {
    if (this.temporalUrl) {
      URL.revokeObjectURL(this.temporalUrl);
    }
    this.lastBlob = null;
  }

  ngOnDestroy() {
    if (this.temporalUrl) {
      URL.revokeObjectURL(this.temporalUrl);
    }
  }

  async syncIfNeeded() {
    if (this.lastBlob && this.value) {
      const rawFileName = this.value.split("?")[0];
      const promesas: Promise<UploadResponse>[] = [];

      promesas.push(this.fileSrv.upload(rawFileName, this.lastBlob, "bucket"));
      await Promise.all(promesas);
      this.destroyBlobUrl();
    }
  }
}
