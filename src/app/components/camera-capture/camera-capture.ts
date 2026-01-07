import {
  Component,
  ElementRef,
  ViewChild,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

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

  private stream?: MediaStream;
  private resolver?: (blob: Blob) => void;
  private rejecter?: (reason?: any) => void;

  isOpen = false;

  constructor(
    public cdr: ChangeDetectorRef,
  ) { }

  /**
   * Public API
   */
  openCamera(): Promise<Blob> {
    this.isOpen = true;

    return new Promise<Blob>(async (resolve, reject) => {
      this.resolver = resolve;
      this.rejecter = reject;

      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });

        setTimeout(() => {
          const video = this.videoRef.nativeElement;
          video.srcObject = this.stream!;
          video.play();
        });

      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
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

    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = undefined;
    }

    this.resolver = undefined;
    this.rejecter = undefined;
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}