import { BodyKeyPointData } from "@mytypes/bodyTypes";
import { ModuloSonido } from "@services/sonido.service";

export class WalkBody {
    now: number = 0;
    handUpLeft: boolean = false;
    handUpRight: boolean = false;
    points: { [key: string]: BodyKeyPointData } = {};

    capture(points: { [key: string]: BodyKeyPointData }) {
        this.now = new Date().getTime();
        this.points = points;
        this.computeLeftHand();
        this.computeRightHand();
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
                ModuloSonido.play('/assets/sounds/off.mp3', false);
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
                ModuloSonido.play('/assets/sounds/off.mp3', false);
                this.handUpLeft = false;
            }
        }
    }

    off() {
        this.handUpLeft = false;
        this.handUpRight = false;
    }
}