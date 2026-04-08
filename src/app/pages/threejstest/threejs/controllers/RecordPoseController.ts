import { ControllerUpdateResponse, AvatarBodyEvent, AVATAR_NAME, StoredAvatarAnimation, StoredAvatarState } from "@mytypes/bodyTypes";
import { SceneControllerAbstract } from "../SceneControllerAbstract";
import { encode } from "@msgpack/msgpack";

export class RecordPoseController extends SceneControllerAbstract {
    recording: boolean = false;
    recordingStartTime: number = 0;
    lastRecorded: number = 0;
    MAX_STATES_PER_SECOND: number = 5;
    history: StoredAvatarAnimation = { a: [] };
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
            const state: StoredAvatarState = {
                t: now,
                d: difference,
                bones: [],
            };
            avatar.traverse((child: any) => {
                if (child.isBone || child.type === 'Bone') {
                    const name = child.name;
                    const position = child.position;
                    const rotation = child.rotation;
                    state.bones.push({
                        n: name,
                        v: [position.x, position.y, position.z, rotation.x, rotation.y, rotation.z],
                    });
                }
            });
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
                this.history = { a: [] };
                this.recordingStartTime = Date.now();
            } else if (event.voiceCommand == "stop") {
                this.recording = false;
                if (this.history.a.length > 0) {
                    this.downloadTextPlain();
                }
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