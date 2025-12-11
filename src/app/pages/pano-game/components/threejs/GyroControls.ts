import * as THREE from 'three';
import { GyroReturnType } from './types';

export class GyroControls {
    private camera: THREE.Camera;
    private enabled = false;

    private alpha: number | null = null;
    private beta: number | null = null;
    private gamma: number | null = null;

    private screenOrientation = 0;

    constructor(camera: THREE.Camera) {
        this.camera = camera;

        this.onDeviceOrientation = this.onDeviceOrientation.bind(this);
        this.onScreenOrientation = this.onScreenOrientation.bind(this);

        window.addEventListener("orientationchange", this.onScreenOrientation);
        this.onScreenOrientation();
    }

    enable() {
        this.enabled = true;
        window.addEventListener("deviceorientation", this.onDeviceOrientation, true);
    }

    disable() {
        this.enabled = false;
        window.removeEventListener("deviceorientation", this.onDeviceOrientation, true);
    }

    private getScreenOrientation(): number {
        if (screen.orientation && screen.orientation.angle !== undefined) {
            return screen.orientation.angle;
        }
        return window.orientation || 0; // fallback
    }

    private onScreenOrientation() {
        this.screenOrientation = this.getScreenOrientation();
    }

    private onDeviceOrientation(event: DeviceOrientationEvent) {
        this.alpha = event.alpha;
        this.beta = event.beta;
        this.gamma = event.gamma;
    }

    update(): GyroReturnType | undefined {
        if (!this.enabled || this.alpha === null) return;

        const alpha = THREE.MathUtils.degToRad(this.alpha);
        const beta = THREE.MathUtils.degToRad(this.beta || 0);
        const gamma = THREE.MathUtils.degToRad(this.gamma || 0);
        const orient = THREE.MathUtils.degToRad(this.screenOrientation);

        // Rotation order taken from old DeviceOrientationControls
        //beta es el axial del celular roll
        //alpha es el axial de mi cabeza yaw
        //gamma es decir si con el celular pitch
        const euler = new THREE.Euler(
            //beta, 
            //alpha, 
            //-gamma, 
            -gamma,
            alpha,
            beta,
            "YXZ");
        const q = new THREE.Quaternion().setFromEuler(euler);
        const qScreen = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 0, 1),
            -orient
        );

        this.camera.quaternion.copy(q).multiply(qScreen);
        return {
            alpha: parseInt((this.alpha).toFixed(0)),
            beta: parseInt((this.beta || 0).toFixed(0)),
            gamma: parseInt((this.gamma || 0).toFixed(0)),
            orient: parseInt((this.screenOrientation).toFixed(0)),
        };
    }
}
