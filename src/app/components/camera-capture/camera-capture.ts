import {
  Component,
  ElementRef,
  ViewChild,
  OnDestroy,
  ChangeDetectorRef,
  Input
} from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Component({
  selector: 'app-camera-capture',
  standalone: true,
  imports: [],
  templateUrl: './camera-capture.html',
  styleUrl: './camera-capture.scss',
})
export class CameraCaptureComponent implements OnDestroy {

  @ViewChild('video', { static: false })
  videoRef!: ElementRef<HTMLVideoElement>;
  @Input() hiddenButton: boolean = false;

  private stream?: MediaStream;
  private resolver?: (blob: Blob) => void;
  private rejecter?: (reason?: any) => void;
  public videoDevices: MediaDeviceInfo[] = [];
  private currentDeviceIndex = 0;
  private result$ = new Subject<Blob>();
  isOpen = false;

  constructor(
    public cdr: ChangeDetectorRef,
  ) { }

  getResult$(): Observable<Blob> {
    return this.result$.asObservable();
  }

  /**
   * Public API
   */
  async openCamera(): Promise<Blob> {
    this.isOpen = true;

    return new Promise<Blob>(async (resolve, reject) => {
      this.resolver = resolve;
      this.rejecter = reject;

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        this.videoDevices = devices.filter(d => d.kind === 'videoinput');
        this.cdr.detectChanges();

        if (this.videoDevices.length === 0) {
          throw new Error('No camera devices found');
        }

        this.currentDeviceIndex = 0;
        await this.startCamera();

      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
  }

  private async startCamera(): Promise<void> {
    this.stopStream();

    const deviceId = this.videoDevices[this.currentDeviceIndex].deviceId;

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { ideal: deviceId } },
      audio: false
    });

    setTimeout(() => {
      const video = this.videoRef.nativeElement;
      video.srcObject = this.stream!;
      video.play();
    });
  }

  private stopStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = undefined;
    }
  }

  async switchCamera(): Promise<void> {
    if (this.videoDevices.length <= 1) {
      return;
    }

    this.currentDeviceIndex =
      (this.currentDeviceIndex + 1) % this.videoDevices.length;

    await this.startCamera();
  }

  capture(): void {
    const video = this.videoRef.nativeElement;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob && this.resolver) {
        this.resolver(blob);
        this.result$.next(blob);
      }
      this.cleanup();
    }, 'image/jpeg', 0.95);
  }

  cancel(): void {
    if (this.rejecter) {
      this.rejecter('User cancelled');
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.isOpen = false;

    this.stopStream();

    this.resolver = undefined;
    this.rejecter = undefined;
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}