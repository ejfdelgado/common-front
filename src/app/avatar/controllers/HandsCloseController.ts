import { SceneControllerAbstract } from "@avatar/SceneControllerAbstract";
import { AvatarBodyEvent, ControllerUpdateResponse } from "@mytypes/BodyTypes";

export class HandsCloseController extends SceneControllerAbstract {

    handsClose: boolean = false;

    override async update(): Promise<ControllerUpdateResponse> {
        const comparable = this.lastData.stateBody.comparable;

        return {};
    }
    override async stop(): Promise<void> {

    }
    override async destroy(): Promise<void> {

    }
    override onEvent(event: AvatarBodyEvent): void {

    }

    /*
    computeDistanceByName(aName: string, bName: string) {
        const a = this.points[aName];
        const b = this.points[bName];
        return this.computeDistance(a, b);
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
    */
}