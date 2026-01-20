import { CommonModule } from '@angular/common';
import {
  Component,
  forwardRef,
  ChangeDetectionStrategy,
  Input,
  ChangeDetectorRef,
  OnDestroy,
  ViewChild,
  OnInit,
  AfterViewInit
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR
} from '@angular/forms';
import { JSONDetailDataType } from '@components/dialog-form/dialog-form.component';
import { FlatJsonDataType } from '@components/form-simple/form-simple';
import { FormSimpleWithout } from '@components/form-simple/form-simple-without';
import { FileService } from '@services/file.srv';
import { GoogleAuthService } from '@services/google-auth.service';
import { getBucketPath } from '@tools/BucketPaths';
import { sortify } from 'ejfdelgado-common-ts';
import { environment } from 'environments/environment';
import { Subscription } from 'rxjs';
import { ComponentBucketField } from 'types/ComponentBucketField';
import { UploadResponse } from 'types/file';

export type ComponentDataType = string | null;

@Component({
  selector: 'app-json-field',
  standalone: true,
  imports: [
    CommonModule,
    FormSimpleWithout,
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
export class JsonField implements ControlValueAccessor, OnInit, AfterViewInit, OnDestroy, ComponentBucketField {
  @ViewChild('inner_form') innerForm!: FormSimpleWithout;

  @Input() label: string = "";
  @Input() config!: JSONDetailDataType;

  value: ComponentDataType = null;
  disabled = false;

  model: any = {};
  onChangeList: Function[] = [];
  onTouchedList: Function[] = [];

  memento: string = "{}";
  mementoUrl: ComponentDataType = null;

  changeSubscription: Subscription | null = null;

  constructor(
    private fileSrv: FileService,
    public cdr: ChangeDetectorRef,
    public authSrv: GoogleAuthService,
  ) {

  }

  ngAfterViewInit(): void {
    this.changeSubscription = this.innerForm.onModelChange((model: FlatJsonDataType) => {
      Object.assign(this.model, model);
      this.hasMementoChanged();
    });
  }

  ngOnInit(): void {

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
      this.model = await this.fileSrv.getJSON(this.getJSONUrl(this.value));
      const keys: string[] = Object.keys(this.model);
      keys.forEach((key) => {
        const value = this.model[key];
        this.innerForm.setFormValue(key, value);
      });
    } else {
      this.model = {};
    }
    // freeze memento
    this.captureMemento();
    this.cdr.detectChanges();
  }

  captureMemento() {
    this.mementoUrl = this.value;
    this.memento = sortify(this.model);
  }

  hasMementoChanged() {
    // TODO consider only after the fist change leave it change to better performance
    const actual = sortify(this.model);
    const changed = actual != this.memento;
    if (changed) {
      this.triggerModelChanged();
    } else {
      this.triggerModelRestored();
    }
    return changed;
  }

  triggerModelRestored() {
    this.value = this.mementoUrl;
    this.onChange(this.value);
    this.onTouched();
    this.cdr.detectChanges();
  }

  triggerModelChanged() {
    if (this.mementoUrl != this.value) {
      return;
    }
    const nextPath = getBucketPath(this.config.template, this.value ? this.value : "", {
      user: GoogleAuthService.userStatic,
    });
    this.value = nextPath;
    this.onChange(this.value);
    this.onTouched();
    this.cdr.detectChanges();
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
    if (this.changeSubscription) {
      this.changeSubscription.unsubscribe();
    }
  }

  async syncIfNeeded() {
    // Check if changes
    if (this.value && this.mementoUrl != this.value) {
      // Needs upload
      const rawFileName = this.value.split("?")[0];
      const promesas: Promise<UploadResponse>[] = [];
      const jsonString = JSON.stringify(this.model, null, 2);
      console.log(jsonString);
      const jsonBlob = new Blob([jsonString], { type: 'application/json' });
      promesas.push(this.fileSrv.upload(rawFileName, jsonBlob, "bucket"));
      await Promise.all(promesas);
    }
  }

  isInvalid() {
    return this.innerForm?.getForm().invalid;
  }

  getJSONUrl(url: string) {
    if (!url) {
      return "./assets/json/sample.json";
    } else {
      if (url.startsWith("./assets/")) {
        return url;
      } else {
        return `https://storage.googleapis.com/${environment.DEFAULT_BUCKET}/${url}`;
      }
    }
  }
}
