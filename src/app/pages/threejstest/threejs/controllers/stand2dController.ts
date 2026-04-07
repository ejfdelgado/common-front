import { AvatarBodyEvent } from "@mytypes/bodyTypes";
import { SceneControllerAbstract } from "../SceneControllerAbstract";
import { computeBodyPointAverage } from "../AvatarUtilities";

export class Stand2dController extends SceneControllerAbstract {

    MIN_SCORE: number = 0.8;

    override async update(): Promise<void> {
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
            return;
        }
        let currenMinY = yPos[0];
        if (yPos.length > 1) {
            if (yPos[1] < currenMinY) {
                currenMinY = yPos[1];
            }
        }
        const head = computeBodyPointAverage("", [
            keypoints2DMap["nose"],
            keypoints2DMap["left_ear"],
            keypoints2DMap["right_ear"],
        ]);
        let signal1 = this.videoSize.height - currenMinY;
        let signal2 = currenMinY - head.y;

        console.log(signal1, signal2);
    }
    override async stop(): Promise<void> {

    }
    override async destroy(): Promise<void> {

    }
    override onEvent(event: AvatarBodyEvent): void {

    }

}