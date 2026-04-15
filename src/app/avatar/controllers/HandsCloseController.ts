import { computeAverageByNames, computeDistance } from "@avatar/AvatarUtilities";
import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { BodyPoseKey } from "@mytypes/BodyParts";
import { AvatarBodyEvent, ControllerUpdateResponse } from "@mytypes/BodyTypes";

export class HandsCloseController extends SceneControllerAbstract {
    HANDS_CLOSE = 0.15;
    HANDS_NOT_CLOSE = 0.25;
    handsClose: boolean = false;

    override async update(): Promise<ControllerUpdateResponse> {
        this.computeHandGet();
        return {};
    }
    override async stop(): Promise<void> {

    }
    override async destroy(): Promise<void> {

    }
    override onEvent(event: AvatarBodyEvent): void {

    }

    computeDistanceByName(aName: string, bName: string) {
        const a = this.lastData.keypoints3DMap[aName];
        const b = this.lastData.keypoints3DMap[bName];
        return computeDistance(a, b);
    }

    computeHandGet() {
        const distance = this.computeDistanceByName(
            BodyPoseKey.left_wrist,
            BodyPoseKey.right_wrist
        );
        const average = computeAverageByNames([
            BodyPoseKey.left_wrist,
            BodyPoseKey.right_wrist,
        ], this.lastData.keypoints3DMap);
        if (distance <= this.HANDS_CLOSE) {
            if (this.handsClose == false) {
                //this.clapLocation.set(average.x, average.y, average.z);
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
}