import {
  ChangeDetectorRef,
  Component,
  forwardRef,
  Input,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  NG_VALIDATORS,
  Validator,
  AbstractControl,
  ValidationErrors,
  FormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { FullscreenService } from '@services/fullscreen.service';
import { EmojiPickerComponent } from '@components/emoji-picker/emoji-picker.component';
import { PhoneInputComponent } from '../phone-input/phone-input';

@Component({
  selector: 'app-emoji-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './emoji-input.html',
  styleUrls: ['./emoji-input.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EmojiInputComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => EmojiInputComponent),
      multi: true
    }
  ]
})
export class EmojiInputComponent extends PhoneInputComponent
  implements ControlValueAccessor, Validator {

  @Input() override label = 'Emoji';

  emoji: string = '';

  constructor(
    public dialog: MatDialog,
    public override cdr: ChangeDetectorRef,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
  ) {
    super(cdr, sanitizer, fullScreenSrv);
  }

  private onEmojiValidatorChange: () => void = () => { };

  // Typed as any because the base class expects a PhoneValue
  override writeValue(value: any): void {
    this.emoji = typeof value === 'string' ? value : '';
    try {
      this.cdr.detectChanges();
    } catch (err) { }
  }

  override registerOnValidatorChange(fn: () => void): void {
    this.onEmojiValidatorChange = fn;
  }

  openPicker(): void {
    if (this.disabled) {
      return;
    }
    const dialogRef = this.dialog.open(EmojiPickerComponent, {
      width: '350px',
      autoFocus: false,
      panelClass: 'custom-emoji-picker'
    });

    dialogRef.afterClosed().subscribe((result: string | undefined) => {
      this.markEmojiAsTouched();
      if (result) {
        this.emoji = result;
        this.update();
      }
    });
  }

  clear(event: Event): void {
    event.stopPropagation();
    if (this.disabled) {
      return;
    }
    this.emoji = '';
    this.update();
  }

  override update(): void {
    this.onChange(this.emoji);
    this.markEmojiAsTouched();
    this.onEmojiValidatorChange();
    try {
      this.cdr.detectChanges();
    } catch (err) { }
  }

  override validate(_: AbstractControl): ValidationErrors | null {
    if (!this.emoji && this.isRequired === true) {
      this.latestErrors = { required: true };
    } else {
      this.latestErrors = null;
    }
    return this.latestErrors;
  }

  private markEmojiAsTouched(): void {
    if (!this.touched) {
      this.touched = true;
      this.onTouched();
    }
  }
}
