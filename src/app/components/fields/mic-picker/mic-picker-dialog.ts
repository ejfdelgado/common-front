import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MicDataType } from '@mytypes/CameraTypes';

export interface MicPickerDialogData {
  currentMic: MicDataType | null;
}

@Component({
  selector: 'app-mic-picker-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './mic-picker-dialog.html',
  styleUrls: [
    './mic-picker-dialog.scss',
    '../../../../assets/css/popups.css',
  ],
})
export class MicPickerDialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('meterCanvas') meterCanvas!: ElementRef<HTMLCanvasElement>;

  mics: MicDataType[] = [];
  selectedMicId: string = '';
  permissionDenied = false;

  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationId: number | null = null;
  private onDeviceChange = () => this.refreshMics();

  constructor(
    public dialogRef: MatDialogRef<MicPickerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MicPickerDialogData,
    public cdr: ChangeDetectorRef,
  ) {
    if (data.currentMic) {
      this.selectedMicId = data.currentMic.id;
    }
  }

  async ngAfterViewInit() {
    navigator.mediaDevices.addEventListener('devicechange', this.onDeviceChange);
    await this.loadMics();
    if (this.mics.length > 0 && !this.selectedMicId) {
      this.selectedMicId = this.mics[0].id;
    }
    this.cdr.detectChanges();
    if (this.selectedMicId) {
      await this.startMic(this.selectedMicId);
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy() {
    navigator.mediaDevices.removeEventListener('devicechange', this.onDeviceChange);
    this.stopStream();
  }

  async refreshMics() {
    const previousId = this.selectedMicId;
    await this.loadMics();

    const stillPresent = this.mics.some(m => m.id === previousId);
    if (!stillPresent) {
      this.selectedMicId = this.mics[0]?.id ?? '';
    }

    this.cdr.detectChanges();

    if (this.selectedMicId && (!stillPresent || !this.stream)) {
      await this.startMic(this.selectedMicId);
      this.cdr.detectChanges();
    }
  }

  async loadMics() {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tempStream.getTracks().forEach(t => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      this.mics = devices
        .filter(d => ['audioinput'].indexOf(d.kind) >= 0)
        .map((d, i) => ({
          id: d.deviceId,
          name: d.label || `Microphone ${i + 1}`,
        }));
      this.permissionDenied = false;
    } catch {
      this.permissionDenied = true;
    }
  }

  async onMicChange() {
    await this.startMic(this.selectedMicId);
  }

  async startMic(deviceId: string) {
    this.stopStream();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.analyser);
      this.drawMeter();
    } catch {
      console.error('Error starting microphone');
    }
  }

  private drawMeter() {
    if (!this.analyser || !this.meterCanvas?.nativeElement) return;

    const canvas = this.meterCanvas.nativeElement;
    const ctx = canvas.getContext('2d')!;
    const data = new Uint8Array(this.analyser.frequencyBinCount);

    const draw = () => {
      this.animationId = requestAnimationFrame(draw);
      this.analyser!.getByteFrequencyData(data);

      const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
      const level = avg / 255;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = Math.floor(canvas.width * level);
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#4caf50');
      gradient.addColorStop(0.6, '#8bc34a');
      gradient.addColorStop(1, '#f44336');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, barWidth, canvas.height);

      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(barWidth, 0, canvas.width - barWidth, canvas.height);
    };

    draw();
  }

  stopStream() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }

  cancel() {
    this.dialogRef.close(null);
  }

  accept() {
    const mic = this.mics.find(m => m.id === this.selectedMicId) ?? null;
    this.dialogRef.close(mic);
  }
}
