import { Component, Input, forwardRef, ElementRef, ViewChild, signal, ChangeDetectorRef, NgZone, ViewChildren, QueryList } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormControl,
  ReactiveFormsModule,
  FormArray,
  FormGroup
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonComponent } from '@components/common.component';
import { ImageGalleryConfigDataType, ImageGalleryType } from 'types/fieldsTypes';
import { Subscription, take } from 'rxjs';
import { EditableInput } from '../editable-input/editable-input';
import { ImageFileComponent } from '../image-field/image-field';
import { ConfirmDialogService } from '@services/confirm-dialog.service';
import { ComponentBucketField } from 'types/ComponentBucketField';
import { FullscreenService } from '@services/fullscreen.service';

@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatIconModule,
    MatFormFieldModule,
    EditableInput,
    ImageFileComponent,
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
export class ImageGalleryComponent extends CommonComponent implements ControlValueAccessor, ComponentBucketField {

  @Input() label: string = "";
  @Input() config!: ImageGalleryConfigDataType;

  @ViewChildren(ImageFileComponent) images!: QueryList<ImageFileComponent>;

  readonly formArray = new FormArray<
    FormGroup<{
      image: FormControl<string>;
      description: FormControl<string>;
    }>
  >([]);

  private sub?: Subscription;
  disabled = false;

  constructor(
    public override sanitizer: DomSanitizer,
    public confirmSrv: ConfirmDialogService,
    public cdr: ChangeDetectorRef,
    private zone: NgZone,
    public override fullScreenSrv: FullscreenService,
  ) {
    super(sanitizer, fullScreenSrv);
  }

  ngOnInit(): void {
    this.sub = this.formArray.valueChanges.subscribe(value => {
      this.onChange(value as ImageGalleryType[]);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /* ===== CVA ===== */

  writeValue(value: ImageGalleryType[] | null): void {
    this.formArray.clear({ emitEvent: false });

    if (!value?.length) {
      return;
    }

    value.forEach(item =>
      this.formArray.push(this.createGroup(item), {
        emitEvent: false,
      })
    );
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    isDisabled ? this.formArray.disable() : this.formArray.enable();
  }

  /* ===== Form helpers ===== */

  add(index: number, item: Partial<ImageGalleryType> = {}): void {

    this.formArray.insert(index,
      this.createGroup({
        image: item.image ?? '',
        description: item.description ?? '',
      })
    );
    this.onTouched();
  }

  async remove(index: number): Promise<void> {
    const confirm = await this.confirmSrv.confirm({
      title: "Está seguro?",
      message: "Al borrar no se podrá deshacer",
    });
    if (!confirm) {
      return;
    }

    queueMicrotask(() => {
      this.formArray.removeAt(index);
      this.onTouched();
      this.onChange(this.getInnerModel());
      this.cdr.detectChanges();
    });
  }

  moveUp(index: number): void {
    if (index === 0) return;
    this.swap(index, index - 1);
  }

  moveDown(index: number): void {
    if (index >= this.formArray.length - 1) return;
    this.swap(index, index + 1);
  }

  private swap(i: number, j: number): void {
    const a = this.formArray.at(i);
    const b = this.formArray.at(j);

    this.formArray.setControl(i, b);
    this.formArray.setControl(j, a);

    this.onTouched();
    this.onChange(this.getInnerModel());
  }

  private createGroup(item: ImageGalleryType) {
    return new FormGroup({
      image: new FormControl(item.image, {
        nonNullable: true,
      }),
      description: new FormControl(item.description, {
        nonNullable: true,
      }),
    });
  }

  getFormControlNamed(name: string, group: FormGroup): FormControl {
    const temp = group.get(name);
    if (!temp) {
      throw new Error("Misconfigured");
    }
    return temp as FormControl;
  }

  getInnerModel() {
    return this.formArray.getRawValue();
  }

  async syncIfNeeded() {
    const temp: ComponentBucketField[] = [];
    this.images.forEach((el) => {
      temp.push(el);
    });
    for (let i = 0; i < temp.length; i++) {
      await temp[i].syncIfNeeded();
    }
  }
}