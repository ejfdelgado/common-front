import { ControllerUpdateResponse, AvatarBodyEvent, AVATAR_NAME } from "@mytypes/bodyTypes";
import { SceneControllerAbstract } from "../SceneControllerAbstract";

export class RecordPoseController extends SceneControllerAbstract {
    recording: boolean = false;
    lastRecorded: number = 0;
    MAX_STATES_PER_SECOND: number = 5;
    override async update(): Promise<ControllerUpdateResponse> {
        const now = Date.now();
        const difference = now - this.lastRecorded;
        if (!this.recording || difference < 1000 * this.MAX_STATES_PER_SECOND) {
            return {};
        }
        // Leer el modelo
        const avatar = this.scene.getObjectByName(AVATAR_NAME);
        if (avatar) {
            //traverse all the skeleton and store position and rotation
            console.log("traverse");
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
            } else if (event.voiceCommand == "stop") {
                this.recording = false;
            }
        }
    }
}