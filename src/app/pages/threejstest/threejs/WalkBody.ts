import { EventEmitter } from "@angular/core";
import { BodyKeyPointData, FrontComputationType } from "@mytypes/bodyTypes";
import { ModuloSonido } from "@services/sonido.service";
import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export class WalkBody {
    now: number = 0;
    sideState: number = 0;
    height: number = 0;
    handUpLeft: boolean = false;
    handUpRight: boolean = false;
    handsClose: boolean = false;
    points: { [key: string]: BodyKeyPointData } = {};
    frontData!: FrontComputationType;
    HANDS_CLOSE = 0.3;
    HANDS_NOT_CLOSE = 0.35;
    MOVEMENT_THRESHOLD = 0.1; // Step detection
    STEP_AMOUNT: number = 3;// Walked distance on every step
    FRONT_REFERENCE = new THREE.Vector3(0, 0, -1);
    UP_REFERENCE = new THREE.Vector3(0, 1, 0);
    ROTATION_AMOUNT: number = 0.25;
    CAMERA_DISTANCE_TO_AVATAR: number = 14;
    CAMERA_HEIGTH_RATIO: number = 4;
    SMOOT_RATIO: number = 0.006 * 0.3;
    MIN_MILLIS_BETWEEN_STEPS: number = 1000;

    // KPIs
    stepCount: number = 0;
    kilometers: number = 0;
    calories: number = 0;
    // Walking variables
    lastStep: number = 0;
    maxDifference: number = 0;
    overpassLastMax: boolean = false;
    rotationY: number = 0;//radians
    translationX: number = 0;
    translationZ: number = 0;
    public transformationMatrix: THREE.Matrix4 = new THREE.Matrix4().identity();
    destinationCameraLocation = new THREE.Vector3(0, 0, 0);
    lastCameraSmoot: number = new Date().getTime();
    destinationLookAt = new THREE.Vector3(0, 0, 0);
    lookAtLastT: number = new Date().getTime();
    lookAtActual = new THREE.Vector3(0, 0, 0);
    public clapLocation: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    public makeClap: EventEmitter<WalkBody> = new EventEmitter();
    lastStepTime: number = 0;
    isTPose: boolean = false;
    MIN_T_POSE_THRESHOLD: number = 0.25;

    capture(
        points: { [key: string]: BodyKeyPointData },
        frontData: FrontComputationType,
    ) {
        this.now = new Date().getTime();
        this.points = points;
        this.frontData = frontData;
        this.height = this.computeHeight();
        this.computeLeftHand();
        this.computeRightHand();
        this.computeHandGet();
        this.checkTPose();
        this.walkLogic();
    }

    computeDistance(a: BodyKeyPointData, b: BodyKeyPointData) {
        const distance = new THREE.Vector3(a.x, a.y, a.z).distanceTo(new THREE.Vector3(b.x, b.y, b.z));
        return distance;
    }

    computeDistanceByName(aName: string, bName: string) {
        const a = this.points[aName];
        const b = this.points[bName];
        return this.computeDistance(a, b);
    }

    computeAverage(points: BodyKeyPointData[]) {
        const nuevo: BodyKeyPointData = {
            name: "avg", score: 0, x: 0, y: 0, z: 0
        };
        points.forEach(a => {
            nuevo.x += a.x;
            nuevo.y += a.y;
            nuevo.z += a.z;
            nuevo.score += a.score;
        });
        const tam = points.length;
        nuevo.x = nuevo.x / tam;
        nuevo.y = nuevo.y / tam;
        nuevo.z = nuevo.z / tam;
        nuevo.score = nuevo.score / tam;
        return nuevo;
    }

    computeAverageByNames(names: string[]) {
        const points = names.map((name: string) => {
            return this.points[name];
        });
        return this.computeAverage(points);
    }

    computeHeight() {
        const hipCenter = this.computeAverageByNames(['left_hip', 'right_hip']);
        const nosePoint = this.points['nose'];
        const distance1 = this.computeDistance(nosePoint, hipCenter);
        const footCenter = this.computeAverageByNames(['left_heel', 'right_heel']);
        const distance2 = this.computeDistance(hipCenter, footCenter);
        return distance1 + distance2;
    }

    computeRightHand() {
        // left hand up
        const height = this.points['nose'].y;
        const wrist = this.points['right_wrist'];
        const wristHeight = wrist.y;
        const onThreshold = 1.1 * height;
        const offTHreshold = 0.9 * height;
        if (wristHeight > onThreshold) {
            if (this.handUpRight == false) {
                ModuloSonido.play('/assets/sounds/on2.mp3', false);
                this.handUpRight = true;
            }
        }
        if (wristHeight < offTHreshold) {
            if (this.handUpRight == true) {
                //ModuloSonido.play('/assets/sounds/off.mp3', false);
                this.handUpRight = false;
            }
        }
    }

    computeLeftHand() {
        // left hand up
        const height = this.points['nose'].y;
        const wrist = this.points['left_wrist'];
        const wristHeight = wrist.y;
        const onThreshold = 1.1 * height;
        const offTHreshold = 0.9 * height;
        if (wristHeight > onThreshold) {
            if (this.handUpLeft == false) {
                ModuloSonido.play('/assets/sounds/on1.mp3', false);
                this.handUpLeft = true;
            }
        }
        if (wristHeight < offTHreshold) {
            if (this.handUpLeft == true) {
                //ModuloSonido.play('/assets/sounds/off.mp3', false);
                this.handUpLeft = false;
            }
        }
    }

    computeHandGet() {
        const distance = this.computeDistanceByName('left_wrist', 'right_wrist');
        const average = this.computeAverageByNames(['left_wrist', 'right_wrist']);
        if (distance <= this.HANDS_CLOSE) {
            if (this.handsClose == false) {
                ModuloSonido.play('/assets/sounds/clap.mp3', false);
                this.clapLocation.set(average.x, average.y, average.z);
                this.makeClap.emit(this);
                this.handsClose = true;
            }
        } else if (distance > this.HANDS_NOT_CLOSE) {
            if (this.handsClose == true) {
                //ModuloSonido.play('/assets/sounds/off.mp3', false);
                this.handsClose = false;
            }
        }
    }

    walkLogic() {
        let differenceAbs = 0;
        const leftHeelIx = this.points['left_heel'];
        const rightHeelIx = this.points['right_heel'];
        const leftHeight = leftHeelIx.y;
        const rightHeight = rightHeelIx.y;
        const difference = leftHeight - rightHeight;
        differenceAbs = Math.abs(difference);
        let makeStep = false;

        if (differenceAbs > this.MOVEMENT_THRESHOLD) {
            if (difference > 0) {
                // Caused by the left foot
                if (this.sideState !== 1) {
                    // Foot switch
                    // Foot change, make the step of the previous amount
                    this.lastStep = this.maxDifference;
                    this.maxDifference = 0;
                    if (this.now - this.lastStepTime < this.MIN_MILLIS_BETWEEN_STEPS) {
                        makeStep = true;
                    }
                    this.lastStepTime = this.now;
                    this.sideState = 1;
                }
            } else {
                // Caused by the right foot
                if (this.sideState !== 2) {
                    this.lastStep = this.maxDifference;
                    if (this.now - this.lastStepTime < this.MIN_MILLIS_BETWEEN_STEPS) {
                        makeStep = true;
                    }
                    this.lastStepTime = this.now;
                    this.sideState = 2;
                }
            }
            this.maxDifference = Math.max(this.maxDifference, differenceAbs);
        }

        if (makeStep) {
            ModuloSonido.play('/assets/sounds/tictoc.mp3', false);
            this.rotationY += (this.frontData.angle + Math.PI / 2) * this.ROTATION_AMOUNT;
            const advanceFront = this.FRONT_REFERENCE.clone().applyAxisAngle(this.UP_REFERENCE, this.rotationY).normalize();
            let forward = 1;
            if (this.isTPose) {
                forward = -1;
            }
            this.translationX += (advanceFront.x * this.lastStep * this.STEP_AMOUNT) * forward;
            this.translationZ += (advanceFront.z * this.lastStep * this.STEP_AMOUNT) * forward;
            const translationMatrix = new THREE.Matrix4().makeTranslation(this.translationX, 0, this.translationZ);
            const rotationMatrix = new THREE.Matrix4().makeRotationY(this.rotationY);
            this.transformationMatrix = new THREE.Matrix4().multiplyMatrices(translationMatrix, rotationMatrix);
            this.stepCount += 1;
            this.lastStep = 0;
        }
    }

    placeCamera(camera: THREE.PerspectiveCamera, orbitals: OrbitControls) {
        this.destinationCameraLocation.y = this.height * this.CAMERA_HEIGTH_RATIO;
        const advanceFront = this.FRONT_REFERENCE.clone().applyAxisAngle(this.UP_REFERENCE, this.rotationY).normalize();
        this.destinationCameraLocation.x = this.translationX - advanceFront.x * this.CAMERA_DISTANCE_TO_AVATAR;
        this.destinationCameraLocation.z = this.translationZ - advanceFront.z * this.CAMERA_DISTANCE_TO_AVATAR;
        this.lastCameraSmoot = this.makeSmoot(camera.position, this.destinationCameraLocation, this.lastCameraSmoot);

        this.destinationLookAt.setX(this.translationX);
        this.destinationLookAt.setY(0);
        this.destinationLookAt.setZ(this.translationZ);
        this.lookAtLastT = this.makeSmoot(this.lookAtActual, this.destinationLookAt, this.lookAtLastT);
        camera.lookAt(this.lookAtActual);
        orbitals.target.set(this.lookAtActual.x, this.lookAtActual.y, this.lookAtActual.z);
    }

    placeLight(light: THREE.PointLight) {
        light.position.x = this.translationX;
        light.position.y = this.height * 2;
        light.position.z = this.translationZ;
    }

    makeSmoot(actual: THREE.Vector3, destination: THREE.Vector3, lastTime: number) {
        const actualT = this.now;
        const diffTime = actualT - lastTime;

        const trayectoria = new THREE.Vector3(
            destination.x - actual.x,
            destination.y - actual.y,
            destination.z - actual.z,
        );
        const length = trayectoria.length();
        trayectoria.normalize();
        const thisStep = diffTime * this.SMOOT_RATIO;
        const currentStep = Math.min(thisStep, length);
        if (currentStep >= 0.0001) {
            trayectoria.multiplyScalar(currentStep);
            actual.x += trayectoria.x;
            actual.y += trayectoria.y;
            actual.z += trayectoria.z;
        } else {
            actual.x = destination.x;
            actual.y = destination.y;
            actual.z = destination.z;
        }
        return actualT;
    }

    checkTPose() {
        // right_shoulder y left_shoulder Y
        const average = this.computeAverageByNames(['right_shoulder', 'left_shoulder']);
        const referenceY = average.y;

        // right_elbow left_elbow Y
        const m1 = Math.abs(this.points['right_elbow'].y - referenceY);
        const m2 = Math.abs(this.points['left_elbow'].y - referenceY);

        // right_wrist left_wrist Y
        const m3 = Math.abs(this.points['right_wrist'].y - referenceY);
        const m4 = Math.abs(this.points['left_wrist'].y - referenceY);

        if (
            m1 < this.MIN_T_POSE_THRESHOLD &&
            m2 < this.MIN_T_POSE_THRESHOLD &&
            m3 < this.MIN_T_POSE_THRESHOLD &&
            m4 < this.MIN_T_POSE_THRESHOLD
        ) {
            if (!this.isTPose) {
                ModuloSonido.play('/assets/sounds/bang.mp3', false);
            }
            this.isTPose = true;
        } else {
            this.isTPose = false;
        }
    }

    off() {
        this.handUpLeft = false;
        this.handUpRight = false;
        this.handsClose = false;
    }
}