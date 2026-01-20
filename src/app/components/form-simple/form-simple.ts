import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AllFieldsDataType, FieldDataType, FieldImageDataType, FieldJSONDataType } from '@components/dialog-form/dialog-form.component';

export abstract class FormSimple {
  form: FormGroup;
  formControlMap: { [key: string]: FormControl } = {};
  fieldNames: string[] = [];
  modelInternal: { [key: string]: any } = {};

  constructor(
    public fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      dynamicFields: this.fb.array([]),
    });
  }

  ngOnInitInternal(fields: AllFieldsDataType[], model: { [key: string]: any }): void {
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
