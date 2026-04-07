import { AvatarBodyEvent, ControllerUpdateResponse } from "@mytypes/bodyTypes";
import { SceneControllerAbstract } from "../SceneControllerAbstract";
import { computeBodyPointAverage } from "../AvatarUtilities";
import { SignalLowPass } from "../SignalLowPass";
import * as THREE from 'three';

export class Stand2dController extends SceneControllerAbstract {
    HORIZONTAL_DISPLACEMENT_PONDERATION = 1.2;
    VERTICAL_JUMP_PONDERATION = 1.2;
    MIN_SCORE: number = 0.8;
    floorSignalLowPass: SignalLowPass = new SignalLowPass(900);
    heightSignalLowPass: SignalLowPass = new SignalLowPass(2000);
    transformationMatrix: THREE.Matrix4 = new THREE.Matrix4().identity();

    override async update(): Promise<ControllerUpdateResponse> {
        // Compute the transformation needed to reflect the 2D situation
        this.videoSize;
        const { keypoints2DMap } = this.lastData;
        const yPos: number[] = [];
        const leftHeel = keypoints2DMap["left_heel"];
        const rightHeel = keypoints2DMap["right_heel"];
        if (leftHeel.score > this.MIN_SCORE) {
            yPos.push(leftHeel.y);
        }
        if (rightHeel.score > this.MIN_SCORE) {
            yPos.push(rightHeel.y);
        }
        if (yPos.length == 0) {
            return {
                avatarTransform: this.transformationMatrix,
            };
        }
        let currenMinY = yPos[0];
        if (yPos.length > 1) {
            if (yPos[1] > currenMinY) {
                currenMinY = yPos[1];
            }
        }
        const head = computeBodyPointAverage("", [
            keypoints2DMap["nose"],
            keypoints2DMap["left_ear"],
            keypoints2DMap["right_ear"],
        ]);

        const floorSignal = this.videoSize.height - currenMinY;
        const heightSignal = currenMinY - head.y;

        this.floorSignalLowPass.addValue(floorSignal);
        this.heightSignalLowPass.addValue(heightSignal);

        const floorSignalLowPassed = this.floorSignalLowPass.compute();
        const heightSignaLowPassed = this.heightSignalLowPass.compute();

        // Jump detection
        const jumpY = (floorSignal - floorSignalLowPassed) / heightSignaLowPassed;

        // X position
        const center = computeBodyPointAverage("", [
            keypoints2DMap["left_hip"],
            keypoints2DMap["right_hip"],
            keypoints2DMap["left_heel"],
            keypoints2DMap["right_heel"],
        ]);
        const xShift = this.videoSize.width / 2 - center.x;

        // Ponderate with the hight
        const xShiftReal = xShift / heightSignaLowPassed;

        this.transformationMatrix = new THREE.Matrix4().makeTranslation(
            xShiftReal * this.HORIZONTAL_DISPLACEMENT_PONDERATION,
            jumpY * this.VERTICAL_JUMP_PONDERATION,
            0,
        );
        return {
            avatarTransform: this.transformationMatrix,
        };
    }
    override async stop(): Promise<void> {

    }
    override async destroy(): Promise<void> {

    }
    override onEvent(event: AvatarBodyEvent): void {

    }

}