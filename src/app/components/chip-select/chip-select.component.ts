import { Component, Input, forwardRef, ElementRef, ViewChild, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { ChipDetailDataType } from '@components/dialog-form/dialog-form.component';

@Component({
  selector: 'app-chip-select',
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
      useExisting: forwardRef(() => ChipSelectComponent),
      multi: true
    }
  ],
  templateUrl: './chip-select.component.html',
  styleUrls: ['./chip-select.component.scss']
})
export class ChipSelectComponent implements ControlValueAccessor {
  @Input() label = 'Select Items';
  @Input() config!: ChipDetailDataType;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  readonly itemCtrl = new FormControl('');

  // State management
  selectedItems = signal<string[]>([]);
  disabled = false;

  // Boilerplate for ControlValueAccessor
  onChange: any = () => { };
  onTouched: any = () => { };

  writeValue(value: string[]): void {
    if (value) {
      this.selectedItems.set(value);
    } else {
      this.selectedItems.set([]);
    }
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }

  // Logic methods
  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value && !this.selectedItems().includes(value)) {
      this.updateValue([...this.selectedItems(), value]);
    }
    event.chipInput!.clear();
    this.itemCtrl.setValue(null);
  }

  remove(item: string): void {
    this.updateValue(this.selectedItems().filter(i => i !== item));
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    const value = event.option.viewValue;
    if (!this.selectedItems().includes(value)) {
      this.updateValue([...this.selectedItems(), value]);
    }
    this.itemCtrl.setValue(null);
  }

  private updateValue(newList: string[]) {
    this.selectedItems.set(newList);
    this.onChange(newList);
    this.onTouched();
  }
}