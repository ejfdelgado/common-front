import { AfterViewInit, Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { toCanvas } from 'qrcode';

export interface QrDialogData {
  url: string;
  emoji?: string;
}

@Component({
  selector: 'app-qr-dialog',
  styleUrl: './qr-dialog.scss',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIcon,
  ],
  templateUrl: './qr-dialog.html',
})
export class QrDialogComponent implements AfterViewInit {

  @ViewChild('qrcanvas') canvasQRRef!: ElementRef;

  constructor(
    private dialogRef: MatDialogRef<QrDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: QrDialogData
  ) { }

  drawCenteredText(
    canvas: HTMLCanvasElement,
    text: string,
    fontSizePx: number,
    sideLength: number,
    fontFamily: string = "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
  ): void {
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Canvas 2D context not supported.");
    }

    // Clear canvas
    const emojiBackSize = fontSizePx * 1.4;
    const padding = (sideLength - emojiBackSize) / 2;
    ctx.fillStyle = 'white';
    ctx.fillRect(padding, padding, emojiBackSize, emojiBackSize);

    // Set font
    ctx.font = `${fontSizePx}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Optional: smooth text rendering
    ctx.imageSmoothingEnabled = true;

    // Draw centered text
    ctx.fillText(text.trim().substring(0, 2), sideLength / 2, sideLength / 2);
  }

  async ngAfterViewInit(): Promise<void> {
    const qrCodeSide = 300;
    const canvasQR = this.canvasQRRef.nativeElement;
    await toCanvas(canvasQR, this.data.url, { width: qrCodeSide, });
    if (typeof this.data.emoji == "string" && this.data.emoji.trim().length > 0) {
      this.drawCenteredText(canvasQR, this.data.emoji, 34, qrCodeSide);
    }
  }

  accept(): void {
    this.dialogRef.close(true);
  }

  open() {
    window.open(this.data.url, "_blank");
  }

  async download() {
    const canvas = this.canvasQRRef.nativeElement;
    const fileName = "qrcode.png";
    // Ensure filename ends with .png
    const finalName = fileName.toLowerCase().endsWith(".png")
      ? fileName
      : `${fileName}.png`;

    // Convert canvas to PNG data URL
    const dataUrl = canvas.toDataURL("image/png");

    // Create temporary download link
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = finalName;

    // Append, trigger click, and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}