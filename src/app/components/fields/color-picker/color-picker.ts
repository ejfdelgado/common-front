import { CommonModule } from '@angular/common';
import {
  Component,
  forwardRef,
  ChangeDetectionStrategy,
  Input,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR
} from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonComponent } from '@components/common.component';
import { FullscreenService } from '@services/fullscreen.service';
import { ColorType } from '@mytypes/WorldAvatar';

interface HslType {
  h: number;
  s: number;
  l: number;
}

type RgbChannel = 'r' | 'g' | 'b';

const SQUARE_WIDTH = 220;
const SQUARE_HEIGHT = 160;
const DEFAULT_COLOR: ColorType = { r: 255, g: 0, b: 0 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rgbToHsl(r: number, g: number, b: number): HslType {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = 60 * (((gn - bn) / delta) % 6);
    } else if (max === gn) {
      h = 60 * ((bn - rn) / delta + 2);
    } else {
      h = 60 * ((rn - gn) / delta + 4);
    }
  }
  if (h < 0) {
    h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): ColorType {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let rp = 0, gp = 0, bp = 0;
  if (h < 60) { rp = c; gp = x; bp = 0; }
  else if (h < 120) { rp = x; gp = c; bp = 0; }
  else if (h < 180) { rp = 0; gp = c; bp = x; }
  else if (h < 240) { rp = 0; gp = x; bp = c; }
  else if (h < 300) { rp = x; gp = 0; bp = c; }
  else { rp = c; gp = 0; bp = x; }

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './color-picker.html',
  styleUrls: ['./color-picker.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ColorPickerComponent),
      multi: true
    }
  ]
})
export class ColorPickerComponent extends CommonComponent implements ControlValueAccessor, AfterViewInit {

  @Input() label: string = "Color";
  @ViewChild('squareCanvas') squareCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly squareWidth = SQUARE_WIDTH;
  readonly squareHeight = SQUARE_HEIGHT;

  value: ColorType = { ...DEFAULT_COLOR };
  hue = 0;
  sat = 100;
  light = 50;
  disabled = false;
  private dragging = false;

  constructor(
    public cdr: ChangeDetectorRef,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
  ) {
    super(sanitizer, fullScreenSrv);
  }

  ngAfterViewInit(): void {
    this.drawSquare();
  }

  /* ========= ControlValueAccessor API ========= */

  writeValue(value: ColorType | null): void {
    this.value = value ? { ...value } : { ...DEFAULT_COLOR };
    this.syncHslFromRgb();
    this.drawSquare();
    try {
      this.cdr.detectChanges();
    } catch (err) { }
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  /* ========= Saturation / Lightness square ========= */

  onSquarePointerDown(event: PointerEvent): void {
    if (this.disabled) return;
    this.dragging = true;
    try {
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
    } catch (err) { }
    this.updateFromPointer(event);
  }

  onSquarePointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    this.updateFromPointer(event);
  }

  onSquarePointerUp(event: PointerEvent): void {
    this.dragging = false;
  }

  private updateFromPointer(event: PointerEvent): void {
    const canvas = this.squareCanvasRef?.nativeElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, rect.width);
    const y = clamp(event.clientY - rect.top, 0, rect.height);
    this.sat = rect.width === 0 ? this.sat : (x / rect.width) * 100;
    this.light = rect.height === 0 ? this.light : 100 - (y / rect.height) * 100;
    this.applyHsl();
  }

  /* ========= Hue slider ========= */

  onHueInput(event: Event): void {
    if (this.disabled) return;
    const input = event.target as HTMLInputElement;
    this.hue = clamp(Number(input.value), 0, 360);
    this.drawSquare();
    this.applyHsl();
  }

  /* ========= Numeric RGB inputs ========= */

  onChannelInput(channel: RgbChannel, event: Event): void {
    if (this.disabled) return;
    const input = event.target as HTMLInputElement;
    const parsed = clamp(Math.round(Number(input.value) || 0), 0, 255);
    this.value = { ...this.value, [channel]: parsed };
    this.syncHslFromRgb();
    this.drawSquare();
    this.emitChange();
  }

  /* ========= Template helpers ========= */

  get markerLeft(): number {
    return this.sat;
  }

  get markerTop(): number {
    return 100 - this.light;
  }

  get hueBackground(): string {
    return 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)';
  }

  get rgbCss(): string {
    return `rgb(${this.value.r}, ${this.value.g}, ${this.value.b})`;
  }

  /* ========= Internal helpers ========= */

  private applyHsl(): void {
    this.value = hslToRgb(this.hue, this.sat, this.light);
    this.emitChange();
  }

  private syncHslFromRgb(): void {
    const hsl = rgbToHsl(this.value.r, this.value.g, this.value.b);
    if (hsl.s > 0) {
      this.hue = hsl.h;
    }
    this.sat = hsl.s;
    this.light = hsl.l;
  }

  private emitChange(): void {
    this.onChange(this.value);
    this.onTouched();
    try {
      this.cdr.detectChanges();
    } catch (err) { }
  }

  private drawSquare(): void {
    const canvas = this.squareCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;
    for (let y = 0; y < canvas.height; y++) {
      const l = 100 - (y / (canvas.height - 1)) * 100;
      for (let x = 0; x < canvas.width; x++) {
        const s = (x / (canvas.width - 1)) * 100;
        const { r, g, b } = hslToRgb(this.hue, s, l);
        const idx = (y * canvas.width + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }
}
