import { EventEmitter } from "@angular/core";
import { BodyKeyPointData, FrontComputationType } from "@mytypes/bodyTypes";
import { ModuloSonido } from "@services/sonido.service";
import * as THREE from 'three';

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
    MOVEMENT_THRESHOLD = 0.11;
    public clapLocation: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    public makeClap: EventEmitter<WalkBody> = new EventEmitter();
    FRONT_REFERENCE = new THREE.Vector3(-1, 0, 0);
    UP_REFERENCE = new THREE.Vector3(0, 1, 0);
    ROTATION_AMOUNT: number = 0.25;
    STEP_AMOUNT: number = 3;
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
            //console.log(`differenceAbs ${differenceAbs} > this.MOVEMENT_THRESHOLD ${this.MOVEMENT_THRESHOLD}`);
            // Somo foot is elevated more than the other
            if (difference > 0) {
                // Caused by the left foot
                if (this.sideState !== 1) {
                    // Foot switch
                    // Foot change, make the step of the previous amount
                    this.lastStep = this.maxDifference;
                    this.maxDifference = 0;
                    makeStep = true;
                    this.sideState = 1;
                }
            } else {
                // Caused by the right foot
                if (this.sideState !== 2) {
                    this.lastStep = this.maxDifference;
                    this.maxDifference = 0;
                    makeStep = true;
                    this.sideState = 2;
                }
            }
            this.maxDifference = Math.max(this.maxDifference, differenceAbs);
        } else {
            // Both foots on the floor
            this.sideState = 0;
        }
        //state.data.difference = difference * 10;
        //state.data.sideState = this.sideState;
        //state.data.lastStep = this.lastStep * 10;

        if (makeStep) {
            ModuloSonido.play('/assets/sounds/tictoc.mp3', false);
            this.rotationY += this.frontData.angle * this.ROTATION_AMOUNT;
            const advanceFront = this.FRONT_REFERENCE.clone().applyAxisAngle(this.UP_REFERENCE, this.rotationY).normalize();
            let forward = 1;
            if (this.handsClose) {
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

    getVector(point: BodyKeyPointData) {
        return new THREE.Vector3(point.x, point.y, point.z);
    }

    off() {
        this.handUpLeft = false;
        this.handUpRight = false;
        this.handsClose = false;
    }
}