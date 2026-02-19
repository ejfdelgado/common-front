import { AfterViewInit, Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { toCanvas } from 'qrcode';

export interface QrDialogData {
  url: string;
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

  async ngAfterViewInit(): Promise<void> {
    const qrCodeSide = 256;
    const canvasQR = this.canvasQRRef.nativeElement;
    await toCanvas(canvasQR, this.data.url, { width: qrCodeSide, });
  }

  accept(): void {
    this.dialogRef.close(true);
  }

  open() {
    window.open(this.data.url, "_blank");
  }
}