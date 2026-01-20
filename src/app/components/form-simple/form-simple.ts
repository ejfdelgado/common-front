import { Component, Inject, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule } from '@angular/forms';
import { EditableInput } from '@components/editable-input/editable-input';
import { MatIcon } from '@angular/material/icon';
import { OnOffToggleComponent } from '@components/on-off-toggle/on-off-toggle';
import { RatingComponent } from '@components/rating/rating';
import { ImageFileComponent } from '@components/image-field/image-field';
import { JsonField } from '@components/json-field/json-field';
import { ComponentBucketField } from 'types/ComponentBucketField';
import { AllFieldsDataType, FieldDataType, FieldImageDataType, FieldJSONDataType } from '@components/dialog-form/dialog-form.component';

@Component({
  selector: 'app-form-simple',
  standalone: true,
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
    EditableInput,
    OnOffToggleComponent,
    RatingComponent,
    ImageFileComponent,
    MatIcon,
    JsonField,
  ],
  templateUrl: './form-simple.html',
  styleUrl: './form-simple.scss',
})
export class FormSimple implements OnInit {

  @Input() fields!: AllFieldsDataType[];
  @Input() model!: { [key: string]: any };

  form: FormGroup;
  formControlMap: { [key: string]: FormControl } = {};
  fieldNames: string[] = [];

  @ViewChildren(ImageFileComponent) images!: QueryList<ImageFileComponent>;
  @ViewChildren(JsonField) jsons!: QueryList<JsonField>;

  constructor(
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      dynamicFields: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    const dynamicFields = this.form.get('dynamicFields') as FormArray;
    for (const field of this.fields) {
      const newField = new FormControl(this.model[field.key]);
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

  async saveAllChangedData() {
    const temp: ComponentBucketField[] = [];
    this.images.forEach((el) => {
      temp.push(el);
    });
    this.jsons.forEach((el) => {
      temp.push(el);
    });
    for (let i = 0; i < temp.length; i++) {
      await temp[i].syncIfNeeded();
    }
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
        if (this.model[key] !== undefined) {
          data[key] = this.model[key];
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
}
