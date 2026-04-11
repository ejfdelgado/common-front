import { SceneControllerAbstract } from "@avatar/SceneControllerAbstract";
import { ControllerUpdateResponse, AvatarBodyEvent, ComparableBody } from "@mytypes/BodyTypes";

export class SimplePosesDetection extends SceneControllerAbstract {
    handUpLeft: boolean = false;
    handUpRight: boolean = false;

    override async update(): Promise<ControllerUpdateResponse> {
        const comparable = this.lastData.stateBody.comparable;
        this.computeLeftHand(comparable);
        this.computeRightHand(comparable);
        return {};
    }
    override async stop(): Promise<void> {

    }
    override async destroy(): Promise<void> {

    }
    override onEvent(event: AvatarBodyEvent): void {

    }

    computeLeftHand(comparable: ComparableBody) {
        const isArmUp = comparable.leftArm.z > 0.8
            && comparable.handL < 15; // Max 15°
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

    computeRightHand(comparable: ComparableBody) {
        const isArmUp = comparable.rightArm.z > 0.8 // 1 is totally up 
            && comparable.handR < 15; // Max 15°
        if (isArmUp) {
            if (!this.handUpRight) {
                this.events.emit({
                    name: "RIGHT_HAND_UP_ON",
                });
                this.handUpRight = true;
            }
        } else {
            if (this.handUpRight) {
                this.events.emit({
                    name: "RIGHT_HAND_UP_OFF",
                });
                this.handUpRight = false;
            }
        }
    }

    checkTPose(comparable: ComparableBody) {
        const leftHandT = comparable.leftArm.y > 0.8
            && comparable.handL < 15; // Max 15°
        const rightHandT = comparable.rightArm.y < -0.8
            && comparable.handR < 15; // Max 15°
        const isTPose = leftHandT && rightHandT;
        if (
            isTPose
        ) {
            if (!this.lastData.stateBody.isTPose) {
                this.lastData.stateBody.isTPose = true;
                this.events.emit({
                    name: "T_POSE_ON",
                });
            }
        } else {
            if (this.lastData.stateBody.isTPose) {
                this.lastData.stateBody.isTPose = false;
                this.events.emit({
                    name: "T_POSE_OFF",
                });
            }
        }
    }
}