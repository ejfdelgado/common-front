import { EventEmitter } from "@angular/core";
import { BodyKeyPointData } from "@mytypes/bodyTypes";
import { ModuloSonido } from "@services/sonido.service";
import * as THREE from 'three';

export class WalkBody {
    now: number = 0;
    height: number = 0;
    handUpLeft: boolean = false;
    handUpRight: boolean = false;
    handsClose: boolean = false;
    points: { [key: string]: BodyKeyPointData } = {};
    HANDS_CLOSE = 0.3;
    HANDS_NOT_CLOSE = 0.35;
    public clapLocation: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    public makeClap: EventEmitter<WalkBody> = new EventEmitter();

    capture(points: { [key: string]: BodyKeyPointData }) {
        this.now = new Date().getTime();
        this.points = points;
        this.height = this.computeHeight();
        this.computeLeftHand();
        this.computeRightHand();
        this.computeHandGet();
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

    off() {
        this.handUpLeft = false;
        this.handUpRight = false;
        this.handsClose = false;
    }
}