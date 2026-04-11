import { SceneControllerAbstract } from "@avatar/SceneControllerAbstract";
import { ControllerUpdateResponse, AvatarBodyEvent, ComparableBody } from "@mytypes/BodyTypes";

export class SimplePosesDetection extends SceneControllerAbstract {

    handUpLeft: boolean = false;

    override async update(): Promise<ControllerUpdateResponse> {
        const comparable = this.lastData.stateBody.comparable;
        this.computeLeftHand(comparable);
        return {};
    }
    override async stop(): Promise<void> {

    }
    override async destroy(): Promise<void> {

    }
    override onEvent(event: AvatarBodyEvent): void {

    }

    computeLeftHand(comparable: ComparableBody) {
        const isArmUp = comparable.leftArm.z > 0.8;
        if (isArmUp) {
            if (!this.handUpLeft) {
                this.events.emit({
                    name: "LEFT_HAND_UP_ON",
                });
                this.handUpLeft = true;
            }
        } else {
            if (this.handUpLeft) {
                this.events.emit({
                    name: "LEFT_HAND_UP_OFF",
                });
                this.handUpLeft = false;
            }
        }
    }

}