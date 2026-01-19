import {
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostListener,
  Input,
  Output,
  viewChild,
  ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { EmojiPickerComponent } from '@components/emoji-picker/emoji-picker.component';

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
  scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  @Input() placeholder = '';
  @Input() ariaLabel = 'Texto';
  @Input() disabled = false;
  @Input() allowEnter: boolean = true;
  @Input() discrete: boolean = true;
  @Input() minHeight: number = 6;
  @Input() maxHeight: number = 10;

  @Output() enter = new EventEmitter<string>();

  savedRange: Range | null = null;

  value = '';
  focused = false;
  private composing = false;
  savedScroll: number = 0;

  constructor(private dialog: MatDialog) {

  }

  saveSelection() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      this.savedRange = selection.getRangeAt(0);
    }
  }

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

  openEmoticons() {
    this.saveScrollPos();
    const dialogRef = this.dialog.open(EmojiPickerComponent, {
      width: '350px',
      autoFocus: false,
      panelClass: 'custom-emoji-picker'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.editable.nativeElement.focus();

        const selection = window.getSelection();
        if (selection && this.savedRange) {
          // 1. Clear any current selection
          selection.removeAllRanges();
          // 2. Re-apply the saved cursor position
          selection.addRange(this.savedRange);

          // 3. Execute the insert command
          document.execCommand('insertText', false, result);

          // 4. Update the saved range to be after the new emoji
          this.saveSelection();
        }
        if (!this.discrete) {
          this.restoreScrollPos();
        }
      }
    });
  }

  private onChange = (_: string) => { };
  private onTouched = () => { };

  saveScrollPos() {
    const el = this.scrollContainer()?.nativeElement;
    this.savedScroll = el ? el.scrollTop : 0;
  }

  restoreScrollPos() {
    const el = this.scrollContainer()?.nativeElement;
    if (el) {
      el.scrollTop = this.savedScroll;
    }
  }
}
