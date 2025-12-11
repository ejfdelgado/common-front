import * as THREE from "three";
import { GyroReturnType } from "./types";

export class DeviceOrientationControlsGPT {
    camera: THREE.Camera;
    enabled = true;

    private alpha: number | null = null;
    private beta: number | null = null;
    private gamma: number | null = null;

    private screenOrientation = 0;
    private deviceOrientationHandler: any;

    constructor(camera: THREE.Camera) {
        this.camera = camera;

        this.deviceOrientationHandler = this.onDeviceOrientation.bind(this);

        if (typeof window !== "undefined") {
            window.addEventListener("orientationchange", this.onScreenOrientation, false);
            this.onScreenOrientation();
        }
    }

    private onScreenOrientation = () => {
        if (window.screen?.orientation?.angle !== undefined) {
            this.screenOrientation = window.screen.orientation.angle;
        } else {
            this.screenOrientation = (window.orientation as number) || 0;
        }
    };

    private onDeviceOrientation(event: DeviceOrientationEvent) {
        this.alpha = event.alpha;
        this.beta = event.beta;
        this.gamma = event.gamma;
    }

    connect() {
        window.addEventListener("deviceorientation", this.deviceOrientationHandler, true);
        this.enabled = true;
    }

    disconnect() {
        window.removeEventListener("deviceorientation", this.deviceOrientationHandler, true);
        this.enabled = false;
    }

    dispose() {
        this.disconnect();
        window.removeEventListener("orientationchange", this.onScreenOrientation);
    }

    update(): GyroReturnType | undefined {
        if (!this.enabled || this.alpha === null || this.beta === null || this.gamma === null) return;

        // Convert degrees → radians
        const alphaRad = THREE.MathUtils.degToRad(this.alpha || 0);
        const betaRad = THREE.MathUtils.degToRad(this.beta || 0);
        const gammaRad = THREE.MathUtils.degToRad(this.gamma || 0);
        const orientRad = THREE.MathUtils.degToRad(this.screenOrientation);

        // OLD DeviceOrientation math:
        // euler order: YXZ
        const euler = new THREE.Euler(betaRad, alphaRad, -gammaRad, "YXZ");

        const quaternion = new THREE.Quaternion().setFromEuler(euler);

        // Correct for screen portrait/landscape
        const qScreen = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 0, 1),
            -orientRad
        );

        quaternion.multiply(qScreen);

        // Older iOS devices used reversed Z axis — keep the behavior
        // Optional: enable if needed
        // if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        //     quaternion.multiply(new THREE.Quaternion(0, 0, 1, 0));
        // }

        this.camera.quaternion.copy(quaternion);

        return {
            alpha: parseInt(this.alpha.toFixed(0)),
            beta: parseInt(this.beta.toFixed(0)),
            gamma: parseInt(this.gamma.toFixed(0)),
            orient: parseInt((this.screenOrientation).toFixed(0)),
        };
    }
}
