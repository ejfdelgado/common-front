import {
  Component,
  ElementRef,
  ViewChild,
  OnDestroy,
  ChangeDetectorRef,
  Input
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Observable, Subject } from 'rxjs';

let currentDeviceIndex: number = 0;

@Component({
  selector: 'app-camera-capture',
  standalone: true,
  imports: [
    MatIconModule,
  ],
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
        await this.startCamera();

      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
  }

  private async startCamera(): Promise<void> {
    this.stopStream();

    const deviceId = this.videoDevices[currentDeviceIndex].deviceId;

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

    currentDeviceIndex = (currentDeviceIndex + 1) % this.videoDevices.length;

    await this.startCamera();
  }

  capture(): void {
    const video = this.videoRef.nativeElement;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const isMobile = 'orientation' in screen;
    const angle =
      (screen.orientation && screen.orientation.angle) ||
      (window as any).orientation ||
      0;

    if (isMobile && angle !== 0) {
      // Mobile device rotated
      if (angle === 90 || angle === -270) {
        // Landscape right
        canvas.width = vh;
        canvas.height = vw;

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(video, -vw / 2, -vh / 2, vw, vh);
        ctx.restore();
      } else if (angle === -90 || angle === 270) {
        // Landscape left
        canvas.width = vh;
        canvas.height = vw;

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(video, -vw / 2, -vh / 2, vw, vh);
        ctx.restore();
      } else if (angle === 180) {
        // Upside down
        canvas.width = vw;
        canvas.height = vh;

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI);
        ctx.drawImage(video, -vw / 2, -vh / 2, vw, vh);
        ctx.restore();
      }
    } else {
      // Desktop OR normal mobile portrait
      canvas.width = vw;
      canvas.height = vh;
      ctx.drawImage(video, 0, 0, vw, vh);
    }

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