import {
    AvatarBodyEvent,
    BodyKeyPointData,
    ControllerUpdateResponse,
} from "@mytypes/BodyTypes";
import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { computeBodyPointAverage } from "@avatar/AvatarUtilities";
import { SignalLowPass } from "@avatar/SignalLowPass";
import * as THREE from 'three';
import { BodyPoseKey } from "@mytypes/BodyParts";

export class Stand2dController extends SceneControllerAbstract {
    HORIZONTAL_DISPLACEMENT_PONDERATION = 1.2;
    VERTICAL_JUMP_PONDERATION = 1.2;
    MIN_SCORE: number = 0.8;
    floorSignalLowPass: SignalLowPass = new SignalLowPass(900);
    heightSignalLowPass: SignalLowPass = new SignalLowPass(2000);
    transformationMatrix: THREE.Matrix4 = new THREE.Matrix4().identity();
    jumping: boolean = false;
    JUMP_THRESHOLD = 0.15; // 0.6 is my maximum
    min3DYValue: number = 0;

    computeMin3DY() {

        const focusPoints: BodyKeyPointData[] = [];

        focusPoints.push(this.lastData.keypoints3DMap[BodyPoseKey.left_heel]);
        focusPoints.push(this.lastData.keypoints3DMap[BodyPoseKey.right_heel]);

        this.min3DYValue = focusPoints.map(a => a.y).reduce((yVal, minVal, currentIndex, array) => {
            if (yVal < minVal) {
                return yVal;
            }
            return minVal;
        }, 0);
    }

    override async update(): Promise<ControllerUpdateResponse> {
        // Compute the transformation needed to reflect the 2D situation
        this.videoSize;
        const { keypoints2DMap } = this.lastData;
        const yPos: number[] = [];
        const leftHeel = keypoints2DMap[BodyPoseKey.left_heel];
        const rightHeel = keypoints2DMap[BodyPoseKey.right_heel];
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
            keypoints2DMap[BodyPoseKey.nose],
            keypoints2DMap[BodyPoseKey.left_ear],
            keypoints2DMap[BodyPoseKey.right_ear],
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
            keypoints2DMap[BodyPoseKey.left_hip],
            keypoints2DMap[BodyPoseKey.right_hip],
            keypoints2DMap[BodyPoseKey.left_heel],
            keypoints2DMap[BodyPoseKey.right_heel],
        ]);
        const xShift = this.videoSize.width / 2 - center.x;

        // Ponderate with the hight
        const xShiftReal = xShift / heightSignaLowPassed;

        if (!this.jumping) {
            if (jumpY >= this.JUMP_THRESHOLD) {
                this.jumping = true;
                this.events.emit({
                    name: "JUMP_ON",
                });
            }
        } else {
            if (jumpY < this.JUMP_THRESHOLD) {
                this.jumping = false;
                this.events.emit({
                    name: "JUMP_OFF",
                });
            }
        }
        this.computeMin3DY();
        this.transformationMatrix = new THREE.Matrix4().makeTranslation(
            xShiftReal * this.HORIZONTAL_DISPLACEMENT_PONDERATION,
            -1 * this.min3DYValue + jumpY * this.VERTICAL_JUMP_PONDERATION,
            0,
        );
        this.events.emit({
            name: "STAND2MATRIX",
            data: this.transformationMatrix,
        });
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