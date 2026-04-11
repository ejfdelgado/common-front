import { EventEmitter } from "@angular/core";
import { BodyPoseKey } from "@mytypes/BodyParts";
import {
    AvatarBodyEvent,
    BodyKeyPointData,
    FrontComputationType,
} from "@mytypes/BodyTypes";
import * as THREE from 'three';

export class WalkBody {
    now: number = 0;
    sideState: number = 0;
    height: number = 0;
    
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
        this.walkLogic();
    }

    computeDistance(a: BodyKeyPointData, b: BodyKeyPointData) {
        const distance = new THREE.Vector3(a.x, a.y, a.z).distanceTo(new THREE.Vector3(b.x, b.y, b.z));
        return distance;
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
            /*
            if (this.isTPose) {
                forward = -1;
            }
            */
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
}