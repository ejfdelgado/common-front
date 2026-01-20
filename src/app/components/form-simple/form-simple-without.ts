import { Component, Input, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule } from '@angular/forms';
import { EditableInput } from '@components/editable-input/editable-input';
import { OnOffToggleComponent } from '@components/on-off-toggle/on-off-toggle';
import { RatingComponent } from '@components/rating/rating';
import { ImageFileComponent } from '@components/image-field/image-field';
import { ComponentBucketField } from 'types/ComponentBucketField';
import { AllFieldsDataType } from '@components/dialog-form/dialog-form.component';
import { FormSimple } from './form-simple';

@Component({
  selector: 'app-form-simple-without',
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
  ],
  templateUrl: './form-simple-without.html',
  styleUrl: './form-simple-without.scss',
})
export class FormSimpleWithout extends FormSimple implements OnInit, OnDestroy {

  @Input() fields!: AllFieldsDataType[];
  @Input() model!: { [key: string]: any };

  @ViewChildren(ImageFileComponent) images!: QueryList<ImageFileComponent>;

  constructor(
    public override fb: FormBuilder,
  ) {
    super(fb);
  }

  ngOnInit(): void {
    super.ngOnInitInternal(this.fields, this.model);
  }

  ngOnDestroy(): void {
    super.ngOnDestroyInternal();
  }

  async saveAllChangedData() {
    const temp: ComponentBucketField[] = [];
    this.images.forEach((el) => {
      temp.push(el);
    });
    for (let i = 0; i < temp.length; i++) {
      await temp[i].syncIfNeeded();
    }
  }
}