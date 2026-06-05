import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { LandmarkList, NormalizedLandmarkList } from "@mediapipe/pose";
import { HandIdType } from "@mytypes/BodyParts";
import { AvatarBodyEvent, ControllerUpdateResponse } from "@mytypes/BodyTypes";

export class HandPointerController extends SceneControllerAbstract {

    HAND_TRESHOLD = 0.8;

    override async update(): Promise<ControllerUpdateResponse> {
        const hands = this.lastData.hands;
        hands.forEach((hand, handId) => {
            const {
                score,
                multiHandLandmarks,
                multiHandWorldLandmarks,
            } = hand;
            if (score > this.HAND_TRESHOLD) {
                this.processHand(
                    handId,
                    multiHandLandmarks,
                    multiHandWorldLandmarks,
                );
            }
        });

        return {};
    }
    override async stop(): Promise<void> {

    }
    override async destroy(): Promise<void> {

    }
    override onEvent(event: AvatarBodyEvent): void {

    }

    processHand(
        handId: HandIdType,
        multiHandLandmarks: NormalizedLandmarkList,
        multiHandWorldLandmarks: LandmarkList,
    ) {
        //Use angleBetweenDegrees
    }
}