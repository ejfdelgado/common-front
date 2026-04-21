import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { CameraDataType } from '@mytypes/CameraTypes';

export interface CameraPickerDialogData {
  currentCamera: CameraDataType | null;
}

@Component({
  selector: 'app-camera-picker-dialog',
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
  templateUrl: './camera-picker-dialog.html',
  styleUrls: [
    './camera-picker-dialog.scss',
    '../../../../assets/css/popups.css',
  ],
})
export class CameraPickerDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  cameras: CameraDataType[] = [];
  selectedCameraId: string = '';
  private stream: MediaStream | null = null;


  constructor(
    public dialogRef: MatDialogRef<CameraPickerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CameraPickerDialogData,
    public cdr: ChangeDetectorRef,
  ) {
    if (data.currentCamera) {
      this.selectedCameraId = data.currentCamera.id;
    }
  }

  async ngOnInit() {

  }

  async ngAfterViewInit() {
    await this.loadCameras();
    if (this.cameras.length > 0) {
      if (!this.selectedCameraId) {
        this.selectedCameraId = this.cameras[0].id;
      }
    }
    this.cdr.detectChanges();
    requestAnimationFrame(async () => {
      await this.startCamera(this.selectedCameraId);
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    this.stopStream();
  }

  async loadCameras() {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(t => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      this.cameras = devices
        .filter(d => d.kind === 'videoinput')
        .map((d, i) => ({
          id: d.deviceId,
          name: d.label || `Camera ${i + 1}`,
        }));
    } catch (err) {
      console.error('Camera permission denied:', err);
    }
  }

  async onCameraChange() {
    await this.startCamera(this.selectedCameraId);
  }

  async startCamera(deviceId: string) {
    this.stopStream();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
      });
      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
      } else {
        console.log("No native element yet!");
      }
    } catch (err) {
      console.error('Error starting camera:', err);
    }
  }

  stopStream() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }

  cancel() {
    this.dialogRef.close(null);
  }

  accept() {
    const camera = this.cameras.find(c => c.id === this.selectedCameraId) ?? null;
    this.dialogRef.close(camera);
  }
}
