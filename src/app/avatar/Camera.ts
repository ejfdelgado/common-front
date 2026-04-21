import { CameraInterface, CameraOptions } from "@mediapipe/camera_utils";

const DEFAULT_OPTIONS: Required<Omit<CameraOptions, 'onFrame'>> = {
    facingMode: 'user',
    width: 640,
    height: 480,
};

export class Camera implements CameraInterface {
    private video: HTMLVideoElement;
    private options: CameraOptions & typeof DEFAULT_OPTIONS;
    private stream: MediaStream | undefined;
    private lastTime: number = 0;

    constructor(video: HTMLVideoElement, options: CameraOptions) {
        this.video = video;
        this.options = Object.assign({}, DEFAULT_OPTIONS, options) as CameraOptions & typeof DEFAULT_OPTIONS;
    }

    async start(): Promise<void> {
        if (!navigator.mediaDevices?.getUserMedia) {
            alert('No navigator.mediaDevices.getUserMedia exists.');
        }
        const { facingMode, width, height } = this.options;
        return navigator.mediaDevices.getUserMedia({ video: { facingMode, width, height } })
            .then((stream) => { this.attach(stream); })
            .catch((err) => {
                const msg = 'Failed to acquire camera feed: ' + err;
                console.error(msg);
                alert(msg);
                throw err;
            });
    }

    async stop(): Promise<void> {
        if (this.stream) {
            for (const track of this.stream.getTracks()) {
                track.stop();
            }
            this.stream = undefined;
        }
    }

    private attach(stream: MediaStream): void {
        this.stream = stream;
        this.video.srcObject = stream;
        this.video.onloadedmetadata = () => {
            this.video.play();
            this.scheduleFrame();
        };
    }

    private scheduleFrame(): void {
        window.requestAnimationFrame(() => { this.processFrame(); });
    }

    private processFrame(): void {
        if (!this.video.paused && this.video.currentTime !== this.lastTime) {
            this.lastTime = this.video.currentTime;
            const result = this.options.onFrame();
            if (result) {
                result.then(() => { this.scheduleFrame(); });
                return;
            }
        }
        this.scheduleFrame();
    }
}
