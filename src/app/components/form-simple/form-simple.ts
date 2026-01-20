import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AllFieldsDataType, FieldDataType, FieldImageDataType, FieldJSONDataType } from '@components/dialog-form/dialog-form.component';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';

export type FlatJsonDataType = { [key: string]: any };

export abstract class FormSimple {
  form: FormGroup;
  formControlMap: { [key: string]: FormControl } = {};
  fieldNames: string[] = [];
  modelInternal: FlatJsonDataType = {};
  changeSubscription: Subscription | null = null;
  changeSubject: Subject<FlatJsonDataType> = new Subject<FlatJsonDataType>();

  constructor(
    public fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      dynamicFields: this.fb.array([]),
    });
  }

  ngOnInitInternal(fields: AllFieldsDataType[], model: FlatJsonDataType): void {
    this.modelInternal = model;
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
      const model: FlatJsonDataType = {};
      for (let i = 0; i < list.length; i++) {
        const name = this.fieldNames[i];
        model[name] = list[i];
      }
      this.changeSubject.next(model);
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

  public abstract saveAllChangedData(): Promise<void>;

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
        if (this.modelInternal[key] !== undefined) {
          data[key] = this.modelInternal[key];
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
    }
    return {
      valid: false,
      data: {},
    };
  }

  castImageType(el: FieldDataType): FieldImageDataType {
    return (el as FieldImageDataType);
  }

  castJSONType(el: FieldDataType): FieldJSONDataType {
    return (el as FieldJSONDataType);
  }

  getForm() {
    return this.form;
  }
}
