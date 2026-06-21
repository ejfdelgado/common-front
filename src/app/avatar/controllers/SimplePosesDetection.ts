import { computeHeight } from "@avatar/utils/AvatarUtilities";
import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { ControllerUpdateResponse, AvatarBodyEvent, ComparableBody } from "@mytypes/BodyTypes";

export class SimplePosesDetection extends SceneControllerAbstract {
    handUpLeft: boolean = false;
    handUpRight: boolean = false;

    override async update(): Promise<ControllerUpdateResponse> {
        const comparable = this.lastData.stateBody.comparable;
        this.computeHeight();
        this.computeLeftHand(comparable);
        this.computeRightHand(comparable);
        this.checkTPose(comparable);
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
        const isArmDown = comparable.leftArm.z < 0.7
            || comparable.handL > 20; // Max 15°
        if (isArmUp) {
            if (!this.handUpLeft) {
                this.events.emit({
                    name: "LEFT_HAND_UP_ON",
                });
                this.handUpLeft = true;
            }
        } else if (isArmDown) {
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
        const isArmDown = comparable.rightArm.z < 0.7
            || comparable.handR > 20; // Max 15°
        if (isArmUp) {
            if (!this.handUpRight) {
                this.events.emit({
                    name: "RIGHT_HAND_UP_ON",
                });
                this.handUpRight = true;
            }
        } else if (isArmDown) {
            if (this.handUpRight) {
                this.events.emit({
                    name: "RIGHT_HAND_UP_OFF",
                });
                this.handUpRight = false;
            }
        }
    }

    checkTPose(comparable: ComparableBody) {
        const FIRST_ARTICULATION_THRESHOLD = 0.7;
        const SECOND_ARTICULATION_THRESHOLD = 35;
        const leftHandT = comparable.leftArm.y > FIRST_ARTICULATION_THRESHOLD
            && comparable.handL < SECOND_ARTICULATION_THRESHOLD; // Max 15°
        const rightHandT = comparable.rightArm.y < -1 * FIRST_ARTICULATION_THRESHOLD
            && comparable.handR < SECOND_ARTICULATION_THRESHOLD; // Max 15°
        const isTPose = leftHandT && rightHandT;


        const leftHandNotT = comparable.leftArm.y < (FIRST_ARTICULATION_THRESHOLD - 0.1)
            || comparable.handL > (SECOND_ARTICULATION_THRESHOLD + 5); // Max 15°
        const rightHandNotT = comparable.rightArm.y > -1 * (FIRST_ARTICULATION_THRESHOLD - 0.1)
            || comparable.handR > (SECOND_ARTICULATION_THRESHOLD + 5); // Max 15°
        const isNotTPose = leftHandNotT || rightHandNotT;

        if (
            isTPose
        ) {
            if (!this.lastData.stateBody.isTPose) {
                this.lastData.stateBody.isTPose = true;
                this.events.emit({
                    name: "T_POSE_ON",
                });
            }
        } else if (isNotTPose) {
            if (this.lastData.stateBody.isTPose) {
                this.lastData.stateBody.isTPose = false;
                this.events.emit({
                    name: "T_POSE_OFF",
                });
            }
        }
    }

    computeHeight() {
        const height = computeHeight(this.lastData.keypoints3DMap);
        this.lastData.stateBody.height = height;
    }
}