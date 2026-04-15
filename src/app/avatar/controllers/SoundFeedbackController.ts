import {
    AvatarBodyEvent,
    ControllerUpdateResponse,
} from "@mytypes/BodyTypes";
import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { ModuloSonido } from "@services/sonido.service";

export class SoundFeedbackController extends SceneControllerAbstract {

    override async update(): Promise<ControllerUpdateResponse> {
        return {};
    }

    override async stop(): Promise<void> {


    }

    override async destroy(): Promise<void> {

    }

    override onEvent(event: AvatarBodyEvent): void {
        if (event.name == "LEFT_HAND_UP_ON") {
            ModuloSonido.play('/assets/sounds/on1.mp3', false);
        } else if (event.name == "RIGHT_HAND_UP_ON") {
            ModuloSonido.play('/assets/sounds/on2.mp3', false);
        } else if (event.name == "HANDS_JOINED_ON") {
            ModuloSonido.play('/assets/sounds/clap.mp3', false);
        } else if (event.name == "T_POSE_ON") {
            ModuloSonido.play('/assets/sounds/bang.mp3', false);
        } else if (event.name == "JUMP_ON") {
            ModuloSonido.play('/assets/sounds/mario-coin.mp3', false);
        } else if (event.name == "CUBE_A_SELECT_ON") {
            ModuloSonido.play('/assets/sounds/piano_do.mp3', false);
        } else if (event.name == "CUBE_B_SELECT_ON") {
            ModuloSonido.play('/assets/sounds/piano_re.mp3', false);
        } else if (event.name == "CUBE_C_SELECT_ON") {
            ModuloSonido.play('/assets/sounds/piano_mi.mp3', false);
        } else if (event.name == "CUBE_D_SELECT_ON") {
            ModuloSonido.play('/assets/sounds/piano_fa.mp3', false);
        } else if ([
            "MAKE_STEP_FORWARD",
            "MAKE_STEP_BACKWARD",
        ].indexOf(event.name) >= 0) {
            ModuloSonido.play('/assets/sounds/tictoc.mp3', false);
        } else if ([
            "HANDS_JOINED_OFF",
            "LEFT_HAND_UP_OFF",
            "T_POSE_OFF",
        ].indexOf(event.name) >= 0) {
            //ModuloSonido.play('/assets/sounds/off.mp3', false);
        }
    }
}