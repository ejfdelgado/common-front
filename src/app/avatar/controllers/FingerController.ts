import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { BodyPoseKey } from "@mytypes/BodyParts";
import { AvatarBodyEvent, ControllerUpdateResponse } from "@mytypes/BodyTypes";

export class FingerController extends SceneControllerAbstract {

    override async update(): Promise<ControllerUpdateResponse> {

        return {};
    }
    override async stop(): Promise<void> {

    }
    override async destroy(): Promise<void> {

    }
    override onEvent(event: AvatarBodyEvent): void {

    }
}