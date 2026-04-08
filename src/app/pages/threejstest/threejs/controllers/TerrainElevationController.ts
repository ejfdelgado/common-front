import { AvatarBodyEvent, ControllerUpdateResponse } from "@mytypes/bodyTypes";
import { SceneControllerAbstract } from "../SceneControllerAbstract";

export class TerrainElevationController extends SceneControllerAbstract {

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