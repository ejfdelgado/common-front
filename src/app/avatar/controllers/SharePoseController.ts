import {
    ControllerUpdateResponse,
    AvatarBodyEvent,
    AVATAR_NAME,
} from "@mytypes/BodyTypes";
import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import * as THREE from 'three';
import { getStoredAvatarState } from "@avatar/utils/AvatarUtilities";
import { GameAction } from "@mytypes/ActionGameTypes";

export class SharePoseController extends SceneControllerAbstract {

    lastRecorded: number = 0;
    MAX_STATES_PER_SECOND: number = 5;
    transformationMatrix: THREE.Matrix4 = new THREE.Matrix4().identity();

    override async update(): Promise<ControllerUpdateResponse> {
        const now = Date.now();
        const difference = now - this.lastRecorded;
        if (difference < 1000 / this.MAX_STATES_PER_SECOND) {
            return {};
        }
        // Leer el modelo
        const avatar = this.scene.getObjectByName(AVATAR_NAME);
        if (avatar) {
            // Traverse all the skeleton and store position and rotation
            const state = getStoredAvatarState(
                0,
                this.transformationMatrix,
                this.scene.avatarStateSmoot,
                avatar,
            );
            const command: GameAction = {
                type: "pos",
                data: state,
            }
            this.p2pSrv.broadcastBinaryData(command);
        }
        this.lastRecorded = now;
        return {};
    }

    override async stop(): Promise<void> { }

    override async destroy(): Promise<void> { }

    override onEvent(event: AvatarBodyEvent): void {
        if (event.name == "STAND2MATRIX") {
            if (event.data) {
                this.transformationMatrix = event.data;
            }
        }
    }
}