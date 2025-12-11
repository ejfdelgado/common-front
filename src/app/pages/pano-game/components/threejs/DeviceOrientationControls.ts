import {
    Euler,
    EventDispatcher,
    Object3D,
    Quaternion,
    Vector3,
} from 'three';
import { GyroReturnType } from './types';

// Define the structure for the DeviceOrientationEvent data
interface DeviceOrientationData {
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
    absolute: boolean;
}

// Reusable quaternion for rotation calculations
const q1 = new Quaternion();

// Euler for rotation calculations
const euler = new Euler(0, 0, 0, 'YXZ');

// Vector for world up
const screenTransform = new Quaternion();
const worldUp = new Vector3(0, 1, 0);

export class DeviceOrientationControls extends EventDispatcher {
    public object: Object3D;
    public enabled: boolean = true;
    public deviceOrientation: DeviceOrientationData = {
        alpha: 0,
        beta: 0,
        gamma: 0,
        absolute: false,
    };

    private onDeviceOrientationChangeBind: (event: DeviceOrientationEvent) => void;
    private screenOrientation: number = 0;
    private onScreenOrientationChangeBind: () => void;
    private readonly PI_2: number = Math.PI / 2;

    // The controls operate on a camera object.
    constructor(object: Object3D) {
        super();
        this.object = object;
        this.object.rotation.reorder('YXZ'); // Crucial for correct orientation math

        this.onDeviceOrientationChangeBind = this.onDeviceOrientationChange.bind(this);
        this.onScreenOrientationChangeBind = this.onScreenOrientationChange.bind(this);

        // Initial setup
        this.onScreenOrientationChange();
    }

    // --- Event Handlers ---

    private onDeviceOrientationChange(event: DeviceOrientationEvent): void {
        this.deviceOrientation.alpha = event.alpha;
        this.deviceOrientation.beta = event.beta;
        this.deviceOrientation.gamma = event.gamma;
        this.deviceOrientation.absolute = event.absolute;
    }

    private onScreenOrientationChange(): void {
        // Get the current screen orientation in degrees (0, 90, 180, 270)
        // Note: window.orientation is deprecated, but widely supported. 
        // Screen Orientation API is the modern alternative, but this is simpler for example.
        const orientation = (window.orientation !== undefined)
            ? (window.orientation as number)
            : (window.screen as any).orientation?.angle || 0;

        this.screenOrientation = (orientation * Math.PI) / 180;
    }

    // --- Public Methods ---

    public enable(): void {
        if ('ondeviceorientation' in window) {
            window.addEventListener('deviceorientation', this.onDeviceOrientationChangeBind, false);
        }
        window.addEventListener('orientationchange', this.onScreenOrientationChangeBind, false);
        this.enabled = true;
    }

    public disable(): void {
        window.removeEventListener('deviceorientation', this.onDeviceOrientationChangeBind, false);
        window.removeEventListener('orientationchange', this.onScreenOrientationChangeBind, false);
        this.enabled = false;
    }

    public dispose(): void {
        this.disable();
    }

    update(): GyroReturnType | undefined {
        if (!this.enabled) return;

        const { alpha, beta, gamma } = this.deviceOrientation;

        if (alpha === null || beta == null || gamma == null) return; // Only update if device orientation data is available

        // Convert degrees to radians
        const degToRad = Math.PI / 180;
        const alphaRad = alpha * degToRad;
        const betaRad = beta * degToRad;
        const gammaRad = gamma * degToRad;
        const orientRad = this.screenOrientation;

        // Apply device orientation to Euler angles
        // The rotation order is YXZ, which is generally suitable for camera controls.
        euler.set(
            betaRad, // beta
            alphaRad, // alpha
            -gammaRad, // gamma
            'YXZ'
        );

        // Convert Euler to Quaternion
        this.object.quaternion.setFromEuler(euler);

        // Reorient to "standard" system (x-forward, y-up, z-right)

        // Camera is looking down the Z axis, so we rotate around the X axis by -90 degrees
        // to point it along the Y-axis (upward) to start, then around Z to point forward.
        q1.setFromAxisAngle(worldUp, -orientRad);
        this.object.quaternion.multiply(q1);

        // Rotate camera to a standard orientation
        // This correction is often needed to align the device's coordinate system with three.js's
        // (X right, Y up, Z out of the screen).
        screenTransform.setFromAxisAngle(new Vector3(1, 0, 0), this.PI_2);
        this.object.quaternion.multiply(screenTransform);

        return {
            alpha: parseInt(alpha.toFixed(0)),
            beta: parseInt(beta.toFixed(0)),
            gamma: parseInt(gamma.toFixed(0)),
            orient: parseInt((this.screenOrientation / degToRad).toFixed(0)),
        };
    }
}