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
import { CommonModule } from '@angular/common';

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
  imports: [
    CommonModule,
  ],
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
  focused = false;
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

  onFocus(): void {
    this.focused = true;
  }

  onBlur(): void {
    this.focused = false;
    this.onTouched();
  }

  onInput(): void {
    if (this.composing) return;

    this.value = this.getText();
    this.onChange(this.value);
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
    return this.editable.nativeElement.innerHTML ?? '';
  }

  private setText(value: string): void {
    this.editable.nativeElement.innerHTML = value;
  }


  /* ---------------- Formatting ---------------- */

  format(command: 'bold' | 'italic', event: MouseEvent): void {
    event.preventDefault(); // keeps focus
    this.editable.nativeElement.focus();
    document.execCommand(command);
  }

  private onChange = (_: string) => { };
  private onTouched = () => { };
}
