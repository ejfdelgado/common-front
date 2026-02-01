import { ChangeDetectorRef } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DifferedStore } from '@components/differedStore';
import { Subject, Subscription } from 'rxjs';
import {
  AllFieldsDataType,
  ChipDataType,
  ContenteditableDataType,
  ContentEditableDetailDataType,
  FieldDataType,
  FieldImageDataType,
  FieldJSONDataType,
  ImageGalleryDataType,
  MDDataType,
  MDDetailDataType
} from 'types/fieldsTypes';

export type FlatJsonDataType = { [key: string]: any };

export abstract class FormSimple implements DifferedStore {
  form: FormGroup;
  formControlMap: { [key: string]: FormControl } = {};
  fieldNames: string[] = [];
  changeSubscription: Subscription | null = null;
  changeSubject: Subject<FlatJsonDataType> = new Subject<FlatJsonDataType>();


  _model: FlatJsonDataType = {};

  constructor(
    public fb: FormBuilder,
    public cdr: ChangeDetectorRef,
    public snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      dynamicFields: this.fb.array([]),
    });
  }

  abstract saveAllChangedData(): Promise<void>;

  ngOnInitInternal(fields: AllFieldsDataType[], model: FlatJsonDataType): void {
    this._model = model;
    const dynamicFields = this.form.get('dynamicFields') as FormArray;
    for (const field of fields) {
      const newField = new FormControl(model[field.key]);
      if (field.required === true) {
        newField.addValidators(Validators.required);
      }
      dynamicFields.push(newField);
      this.fieldNames.push(field.key);
      this.formControlMap[field.key] = newField;
    }
    this.changeSubscription = this.form.valueChanges.subscribe(newValue => {
      const list = newValue.dynamicFields;
      if (!this._model) {
        this._model = {};
      }
      for (let i = 0; i < list.length; i++) {
        const name = this.fieldNames[i];
        this._model[name] = list[i];
      }
      this.changeSubject.next(this._model);
    });
  }

  onModelChange(fun: any) {
    return this.changeSubject.asObservable()
      .subscribe(fun);
  }

  ngOnDestroyInternal() {
    if (this.changeSubscription) {
      this.changeSubscription.unsubscribe();
    }
  }

  setFormValue(key: string, value: any) {
    this.formControlMap[key].setValue(value);
    this.formControlMap[key].markAsPristine();
    this.formControlMap[key].markAsUntouched();
  }

  get dynamicFields() {
    return this.form.get('dynamicFields') as FormArray;
  }

  async save(): Promise<{
    valid: boolean,
    data: { [key: string]: any },
  }> {
    if (this.form.valid) {
      const dataArray = this.form.value.dynamicFields;
      const data: { [key: string]: any } = {};
      // Add id if provided
      const PASSTRHU = ["id"];
      PASSTRHU.forEach((key) => {
        if (this._model[key] !== undefined) {
          data[key] = this._model[key];
        }
      });

      for (let i = 0; i < this.fieldNames.length; i++) {
        const fieldName = this.fieldNames[i];
        if (!data["id"] || this.formControlMap[fieldName].dirty) {
          data[fieldName] = dataArray[i];
        }
      }

      await this.saveAllChangedData();

      return {
        valid: true,
        data,
      };
    } else {
      this.snackBar.open("Invalid form", 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    }
    return {
      valid: false,
      data: {},
    };
  }

  castImageType(el: FieldDataType): FieldImageDataType {
    return (el as FieldImageDataType);
  }

  castContenteditableType(el: FieldDataType): ContenteditableDataType {
    return (el as ContenteditableDataType);
  }

  getContentEditable(el: FieldDataType): ContentEditableDetailDataType {
    const temp: any = this.castContenteditableType(el);
    return Object.assign({
      minHeight: "6em",
      maxHeight: "10em",
    }, temp.contenteditable);
  }

  castMDType(el: FieldDataType): MDDataType {
    return (el as MDDataType);
  }

  getMD(el: FieldDataType): MDDetailDataType {
    const temp: any = this.castMDType(el);
    return Object.assign({
      minHeight: "6em",
    }, temp.md);
  }

  castJSONType(el: FieldDataType): FieldJSONDataType {
    return (el as FieldJSONDataType);
  }

  castChipType(el: FieldDataType): ChipDataType {
    return (el as ChipDataType);
  }

  castImageGalleryType(el: FieldDataType): ImageGalleryDataType {
    return (el as ImageGalleryDataType);
  }

  getForm() {
    return this.form;
  }
}
