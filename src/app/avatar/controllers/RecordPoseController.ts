import {
    ControllerUpdateResponse,
    AvatarBodyEvent,
    AVATAR_NAME,
    StoredAvatarAnimation,
    StoredAvatarState,
    AVATAR_ANIM_VERSION,
} from "@mytypes/BodyTypes";
import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { encode } from "@msgpack/msgpack";
import * as THREE from 'three';
import { getStoredAvatarState, matrixToArray } from "@avatar/utils/AvatarUtilities";
import { EXPORTED_BONES } from "@mytypes/BodyParts";

export class RecordPoseController extends SceneControllerAbstract {

    recording: boolean = false;
    recordingStartTime: number = 0;
    lastRecorded: number = 0;
    MAX_STATES_PER_SECOND: number = 10;
    history: StoredAvatarAnimation = { v: AVATAR_ANIM_VERSION, a: [] };
    transformationMatrix: THREE.Matrix4 = new THREE.Matrix4().identity();

    override async update(): Promise<ControllerUpdateResponse> {
        const now = Date.now();
        const difference = now - this.lastRecorded;
        if (!this.recording || difference < 1000 / this.MAX_STATES_PER_SECOND) {
            return {};
        }
        // Leer el modelo
        const avatar = this.scene.getObjectByName(AVATAR_NAME);
        if (avatar) {
            // Traverse all the skeleton and store position and rotation
            const state = getStoredAvatarState(
                now - this.recordingStartTime,
                this.transformationMatrix,
                this.scene.avatarStateSmoot,
                avatar,
            );
            this.history.a.push(state);
        }
        this.lastRecorded = now;
        return {};
    }

    override async stop(): Promise<void> {

    }
    override async destroy(): Promise<void> {

    }

    override onEvent(event: AvatarBodyEvent): void {
        if (event.name == "VOICE_COMMAND") {
            if (event.voiceCommand == "start") {
                this.recording = true;
                this.history = { v: AVATAR_ANIM_VERSION, a: [] };
                this.recordingStartTime = Date.now();
            } else if (event.voiceCommand == "stop") {
                this.recording = false;
                if (this.history.a.length > 0) {
                    this.downloadTextPlain();
                }
            }
        } else if (event.name == "STAND2MATRIX") {
            if (event.data) {
                this.transformationMatrix = event.data;
            }
        }
    }

    downloadTextPlain(filename = 'animation.bin') {
        const encoded = encode(this.history);

        const blob = new Blob([encoded], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();

        URL.revokeObjectURL(url);
    }
}