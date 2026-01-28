import { Component, Input, forwardRef, ElementRef, ViewChild, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonComponent } from '@components/common.component';
import { ImageGalleryDetailDataType } from 'types/fieldsTypes';

export type ImageGalleryDataType = {
  image: string,
  description?: string,
};

@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatIconModule,
    MatFormFieldModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImageGalleryComponent),
      multi: true
    }
  ],
  templateUrl: './image-gallery.html',
  styleUrl: './image-gallery.scss',
})
export class ImageGalleryComponent extends CommonComponent implements ControlValueAccessor {
  @Input() label = 'Selecciona';
  @Input() config!: ImageGalleryDetailDataType;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  readonly itemCtrl = new FormControl('');

  // State management
  selectedItems = signal<ImageGalleryDataType[]>([]);
  disabled = false;

  constructor(
    public override sanitizer: DomSanitizer,
  ) {
    super(sanitizer);
  }

  writeValue(value: ImageGalleryDataType[]): void {
    if (value) {
      this.selectedItems.set(value);
    } else {
      this.selectedItems.set([]);
    }
  }

  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }

  private updateValue(newList: ImageGalleryDataType[]) {
    this.selectedItems.set(newList);
    this.onChange(newList);
    this.onTouched();
  }
}