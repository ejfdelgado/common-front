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
import { getBucketPath, getThumbnailPath } from '@tools/BucketPaths';
import { ComponentBucketField } from 'app/types/ComponentBucketField';
import { environment } from 'environments/environment';
import { UploadResponse } from 'types/file';

export type ComponentDataType = string | null;

@Component({
  selector: 'app-json-field',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIcon,
  ],
  templateUrl: './json-field.html',
  styleUrls: ['./json-field.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => JsonField),
      multi: true
    }
  ]
})
export class JsonField {
  @Input() label: string = "";
  value: ComponentDataType = null;
  disabled = false;

  model: any = null;
  onChangeList: Function[] = [];
  onTouchedList: Function[] = [];

  constructor(
    private fileSrv: FileService,
    public cdr: ChangeDetectorRef,
    public authSrv: GoogleAuthService,
  ) {

  }

  /* ========= ControlValueAccessor API ========= */

  private onChange(value: ComponentDataType) {
    this.onChangeList.forEach((el) => {
      el(value);
    });
  };
  private onTouched() {
    this.onTouchedList.forEach((el) => {
      el();
    });
  };

  writeValue(value: ComponentDataType | null): void {
    this.value = value;
  }

  registerOnChange(fn: (value: ComponentDataType) => void): Function {
    const list = this.onChangeList;
    list.push(fn);
    return () => {
      const ix = list.indexOf(fn);
      if (ix >= 0) {
        list.splice(ix, 1);
      }
    }
  }

  registerOnTouched(fn: () => void): Function {
    const list = this.onTouchedList;
    list.push(fn);
    return () => {
      const ix = list.indexOf(fn);
      if (ix >= 0) {
        list.splice(ix, 1);
      }
    }
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
