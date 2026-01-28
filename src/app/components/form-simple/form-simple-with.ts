import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule } from '@angular/forms';
import { EditableInput } from '@components/fields/editable-input/editable-input';
import { OnOffToggleComponent } from '@components/fields/on-off-toggle/on-off-toggle';
import { RatingComponent } from '@components/fields/rating/rating';
import { ImageFileComponent } from '@components/fields/image-field/image-field';
import { JsonField } from '@components/fields/json-field/json-field';
import { ComponentBucketField } from 'types/ComponentBucketField';
import { FlatJsonDataType, FormSimple } from './form-simple';
import { PhoneInputComponent } from '@components/fields/phone-input/phone-input';
import { ChipSelectComponent } from '@components/fields/chip-select/chip-select.component';
import { AllFieldsDataType } from 'types/fieldsTypes';
import { ImageGalleryComponent } from '@components/fields/image-gallery/image-gallery';

@Component({
  selector: 'app-form-simple-with',
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
    JsonField,
    PhoneInputComponent,
    ChipSelectComponent,
    ImageGalleryComponent,
  ],
  templateUrl: './form-simple-with.html',
  styleUrl: './form-simple-with.scss',
})
export class FormSimpleWith extends FormSimple implements OnInit, OnDestroy {

  @Input() fields!: AllFieldsDataType[];
  @Input()
  get model(): FlatJsonDataType {
    return this._model;
  };

  set model(val: FlatJsonDataType) {
    this._model = val;
  }

  @ViewChildren(ImageFileComponent) images!: QueryList<ImageFileComponent>;
  @ViewChildren(ImageGalleryComponent) imageGallery!: QueryList<ImageGalleryComponent>;
  @ViewChildren(JsonField) jsons!: QueryList<JsonField>;

  constructor(
    public override fb: FormBuilder,
    public override cdr: ChangeDetectorRef,
  ) {
    super(fb, cdr);
  }

  ngOnDestroy(): void {
    super.ngOnDestroyInternal();
  }

  ngOnInit(): void {
    super.ngOnInitInternal(this.fields, this.model);
  }

  async saveAllChangedData() {
    const temp: ComponentBucketField[] = [];
    this.images.forEach((el) => { temp.push(el); });
    this.imageGallery.forEach((el) => { temp.push(el); });
    this.jsons.forEach((el) => { temp.push(el); });
    for (let i = 0; i < temp.length; i++) {
      await temp[i].syncIfNeeded();
    }
  }
}