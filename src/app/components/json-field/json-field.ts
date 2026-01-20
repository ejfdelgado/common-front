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
import { JSONDetailDataType } from '@components/dialog-form/dialog-form.component';
import { FileService } from '@services/file.srv';
import { GoogleAuthService } from '@services/google-auth.service';
import { ComponentBucketField } from 'app/types/ComponentBucketField';
import { sortify } from 'ejfdelgado-common-ts';
import { environment } from 'environments/environment';

export type ComponentDataType = string | null;

@Component({
  selector: 'app-json-field',
  standalone: true,
  imports: [
    CommonModule,
    //MatButtonModule,
    //MatIcon,
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
export class JsonField implements ControlValueAccessor, OnDestroy, ComponentBucketField {
  @Input() label: string = "";
  value: ComponentDataType = null;
  @Input() config!: JSONDetailDataType;
  disabled = false;

  model: any = null;
  onChangeList: Function[] = [];
  onTouchedList: Function[] = [];

  memento: string = "null";

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
    this.reloadModel();
  }

  async reloadModel() {
    if (this.value) {
      this.model = await this.fileSrv.getJSON(this.value);
    } else {
      this.model = null;
    }
    // freeze memento
    this.captureMemento();
    this.cdr.detectChanges();
  }

  captureMemento() {
    this.memento = sortify(this.model);
  }

  hasMementoChanged() {
    const actual = sortify(this.model);
    return actual != this.memento;
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

  ngOnDestroy() {

  }

  async syncIfNeeded() {
    // Check if changes
    // Create next
  }
}
