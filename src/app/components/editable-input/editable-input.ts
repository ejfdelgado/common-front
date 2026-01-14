import {
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostListener,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-editable-input',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EditableInput),
      multi: true,
    },
  ],
  imports: [],
  templateUrl: './editable-input.html',
  styleUrl: './editable-input.scss',
})
export class EditableInput implements ControlValueAccessor {
  @ViewChild('editable', { static: true }) editable!: ElementRef<HTMLDivElement>;

  @Input() placeholder = '';
  @Input() ariaLabel = 'Text input';
  @Input() disabled = false;
  @Input() allowEnter: boolean = true;

  @Output() enter = new EventEmitter<string>();

  value = '';
  private composing = false;

  /* ---------------- CVA ---------------- */

  writeValue(value: string): void {
    this.value = value ?? '';
    this.setText(this.value);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
    this.editable.nativeElement.contentEditable = String(!disabled);
  }

  /* ---------------- Events ---------------- */

  onInput(): void {
    if (this.composing) return;

    this.value = this.getText();
    this.onChange(this.value);
  }

  onBlur(): void {
    this.onTouched();
  }

  @HostListener('keydown.enter', ['$event'])
  onEnter(event: any): void {
    if (this.allowEnter) {
      return;
    }
    event.preventDefault();
    this.enter.emit(this.value);
  }

  @HostListener('keydown', ['$event'])
  preventNewLines(event: any): void {
    if (event.key === 'Enter') {
      if (this.allowEnter) {
        return;
      }
      event.preventDefault();
    }
  }

  @HostListener('compositionstart')
  onCompositionStart(): void {
    this.composing = true;
  }

  @HostListener('compositionend')
  onCompositionEnd(): void {
    this.composing = false;
    this.onInput();
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    document.execCommand('insertText', false, text);
  }

  /* ---------------- Helpers ---------------- */

  private getText(): string {
    return this.editable.nativeElement.textContent ?? '';
  }

  private setText(value: string): void {
    this.editable.nativeElement.textContent = value;
  }

  private onChange = (_: string) => { };
  private onTouched = () => { };
}
