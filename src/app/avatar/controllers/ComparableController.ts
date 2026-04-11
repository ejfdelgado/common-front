import { computeComparableFromModel } from "@avatar/AvatarUtilities";
import { SceneControllerAbstract } from "@avatar/SceneControllerAbstract";
import { ControllerUpdateResponse, AvatarBodyEvent, AVATAR_NAME } from "@mytypes/BodyTypes";


export class ComparableController extends SceneControllerAbstract {

    override async update(): Promise<ControllerUpdateResponse> {
        const avatar = this.scene.getObjectByName(AVATAR_NAME);
        if (avatar) {
            const comparable = computeComparableFromModel(avatar);
            // asignarlo al papá correspondiente
            this.lastData.stateBody.comparable = comparable;
        }
        return {};
    }
    override async stop(): Promise<void> {


    }
    override async destroy(): Promise<void> {

    }
    override onEvent(event: AvatarBodyEvent): void {

    }

}