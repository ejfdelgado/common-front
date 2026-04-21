import { CameraInterface, CameraOptions } from "@mediapipe/camera_utils";

export interface CameraOptionsExt extends CameraOptions {
    deviceId: string;
}

export class Camera implements CameraInterface {

    constructor(video: HTMLVideoElement, options: CameraOptions) {

    }

    async start(): Promise<void> {

    }

    async stop(): Promise<void> {

    }
}