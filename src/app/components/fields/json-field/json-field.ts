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
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors
} from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonComponent } from '@components/common.component';
import { FlatJsonDataType } from '@components/form-simple/form-simple';
import { FormSimpleWithout } from '@components/form-simple/form-simple-without';
import { AuthService } from '@services/auth.service';
import { FileService } from '@services/file.srv';
import { FullscreenService } from '@services/fullscreen.service';
import { getBucketPath, getJSONUrl } from '@tools/BucketPaths';
import { sortify } from 'ejfdelgado-common-ts';
import { environment } from 'environments/environment';
import { Subscription } from 'rxjs';
import { ComponentBucketField } from 'types/ComponentBucketField';
import { JSONDetailDataType } from 'types/fieldsTypes';
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
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => JsonField),
      multi: true
    },
  ]
})
export class JsonField extends CommonComponent implements ControlValueAccessor, OnInit, AfterViewInit, OnDestroy, ComponentBucketField {
  @ViewChild('inner_form') innerForm!: FormSimpleWithout;

  @Input() label: string = "";
  @Input() config!: JSONDetailDataType;

  value: ComponentDataType = null;
  disabled = false;

  model: any = {};

  memento: string = "{}";
  mementoUrl: ComponentDataType = null;

  changeSubscription: Subscription | null = null;

  constructor(
    private fileSrv: FileService,
    public cdr: ChangeDetectorRef,
    public authSrv: AuthService,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
  ) {
    super(sanitizer, fullScreenSrv);
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

  writeValue(value: ComponentDataType | null): void {
    this.value = value;
    this.reloadModel();
  }

  async reloadModel() {
    if (this.value) {
      this.model = await this.fileSrv.getJSON(getJSONUrl(this.value));
      const model = JSON.parse(JSON.stringify(this.model));
      const keys: string[] = Object.keys(model);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = model[key];
        this.innerForm.setFormValue(key, value);
      }
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
      if (!this.triggerModelChanged()) {
        this.notifyChanges();
      }
    } else {
      this.triggerModelRestored();
    }
    return changed;
  }

  triggerModelRestored() {
    this.value = this.mementoUrl;
    this.notifyChanges();
  }

  notifyChanges() {
    this.onChange(this.value);
    this.onTouched();
    this.cdr.detectChanges();
  }

  triggerModelChanged() {
    if (this.mementoUrl != this.value) {
      return false;
    }
    const nextPath = getBucketPath(this.config.template, this.value ? this.value : "", {
      user: AuthService.userStatic,
    });
    this.value = nextPath;
    this.notifyChanges();
    return true;
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
      const { valid, data } = await this.innerForm.save();
      if (valid) {
        // Needs upload
        const rawFileName = this.value.split("?")[0];
        const promesas: Promise<UploadResponse>[] = [];
        const jsonString = JSON.stringify(this.model, null, 2);
        const jsonBlob = new Blob([jsonString], { type: 'application/json' });
        promesas.push(this.fileSrv.upload(rawFileName, jsonBlob, "bucket"));
        await Promise.all(promesas);
      }
    }
  }

  isInvalid() {
    return this.innerForm?.getForm().invalid;
  }

  validate(control: AbstractControl): ValidationErrors | null {
    if (this.isInvalid()) {
      return { inconsistent: true };
    }

    return null;
  }
}
