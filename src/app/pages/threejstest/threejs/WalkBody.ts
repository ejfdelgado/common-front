import { EventEmitter } from "@angular/core";
import { BodyPoseKey } from "@mytypes/BodyParts";
import { AvatarBodyEvent, BodyKeyPointData, FrontComputationType } from "@mytypes/bodyTypes";
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
    MOVEMENT_THRESHOLD = 0.1; // Step detection
    FRONT_REFERENCE = new THREE.Vector3(0, 0, -1);
    UP_REFERENCE = new THREE.Vector3(0, 1, 0);
    MIN_MILLIS_BETWEEN_STEPS: number = 1000;

    // Walking variables
    stepSize: number = 0;
    maxDifference: number = 0;
    overpassLastMax: boolean = false;
    public clapLocation: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    lastStepTime: number = 0;
    isTPose: boolean = false;
    MIN_T_POSE_THRESHOLD: number = 0.25;

    constructor(private events: EventEmitter<AvatarBodyEvent>) {

    }

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
        const hipCenter = this.computeAverageByNames([
            BodyPoseKey.left_hip,
            BodyPoseKey.right_hip,
        ]);
        const nosePoint = this.points[BodyPoseKey.nose];
        const distance1 = this.computeDistance(nosePoint, hipCenter);
        const footCenter = this.computeAverageByNames([
            BodyPoseKey.left_heel,
            BodyPoseKey.right_heel,
        ]);
        const distance2 = this.computeDistance(hipCenter, footCenter);
        return distance1 + distance2;
    }

    computeRightHand() {
        // left hand up
        const height = this.points[BodyPoseKey.nose].y;
        const wrist = this.points[BodyPoseKey.right_wrist];
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
        const height = this.points[BodyPoseKey.nose].y;
        const wrist = this.points[BodyPoseKey.left_wrist];
        const wristHeight = wrist.y;
        const onThreshold = 1.1 * height;
        const offTHreshold = 0.9 * height;
        if (wristHeight > onThreshold) {
            if (!this.handUpLeft) {
                this.events.emit({
                    name: "LEFT_HAND_UP_ON",
                });
                this.handUpLeft = true;
            }
        }
        if (wristHeight < offTHreshold) {
            if (this.handUpLeft) {
                this.events.emit({
                    name: "LEFT_HAND_UP_OFF",
                });
                this.handUpLeft = false;
            }
        }
    }

    computeHandGet() {
        const distance = this.computeDistanceByName(
            BodyPoseKey.left_wrist,
            BodyPoseKey.right_wrist
        );
        const average = this.computeAverageByNames([
            BodyPoseKey.left_wrist,
            BodyPoseKey.right_wrist,
        ]);
        if (distance <= this.HANDS_CLOSE) {
            if (this.handsClose == false) {
                this.clapLocation.set(average.x, average.y, average.z);
                this.handsClose = true;
                this.events.emit({
                    name: "HANDS_JOINED_ON",
                });
            }
        } else if (distance > this.HANDS_NOT_CLOSE) {
            if (this.handsClose == true) {
                //ModuloSonido.play('/assets/sounds/off.mp3', false);
                this.handsClose = false;
                this.events.emit({
                    name: "HANDS_JOINED_OFF",
                });
            }
        }
    }

    walkLogic() {
        let differenceAbs = 0;
        const leftHeelIx = this.points[BodyPoseKey.left_heel];
        const rightHeelIx = this.points[BodyPoseKey.right_heel];
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
                    this.stepSize = this.maxDifference;
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
                    this.stepSize = this.maxDifference;
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
            let forward = 1;
            if (this.isTPose) {
                forward = -1;
            }
            if (forward > 0) {
                this.events.emit({
                    name: "MAKE_STEP_FORWARD",
                });
            } else {
                this.events.emit({
                    name: "MAKE_STEP_BACKWARD",
                });
            }
            this.stepSize = 0;
        }
    }

    checkTPose() {
        // right_shoulder y left_shoulder Y
        const average = this.computeAverageByNames([
            BodyPoseKey.right_shoulder,
            BodyPoseKey.left_shoulder,
        ]);
        const referenceY = average.y;

        // right_elbow left_elbow Y
        const m1 = Math.abs(this.points[BodyPoseKey.right_elbow].y - referenceY);
        const m2 = Math.abs(this.points[BodyPoseKey.left_elbow].y - referenceY);

        // right_wrist left_wrist Y
        const m3 = Math.abs(this.points[BodyPoseKey.right_wrist].y - referenceY);
        const m4 = Math.abs(this.points[BodyPoseKey.left_wrist].y - referenceY);

        if (
            m1 < this.MIN_T_POSE_THRESHOLD &&
            m2 < this.MIN_T_POSE_THRESHOLD &&
            m3 < this.MIN_T_POSE_THRESHOLD &&
            m4 < this.MIN_T_POSE_THRESHOLD
        ) {
            if (!this.isTPose) {
                this.isTPose = true;
                this.events.emit({
                    name: "T_POSE_ON",
                });
            }
        } else {
            if (this.isTPose) {
                this.isTPose = false;
                this.events.emit({
                    name: "T_POSE_OFF",
                });
            }
        }
    }

    off() {
        this.handUpLeft = false;
        this.handUpRight = false;
        this.handsClose = false;
        this.isTPose = false;
    }
}