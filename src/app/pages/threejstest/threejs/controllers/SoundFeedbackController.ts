import { AvatarBodyEvent } from "@mytypes/bodyTypes";
import { SceneControllerAbstract } from "../SceneControllerAbstract";
import { ModuloSonido } from "@services/sonido.service";

export class SoundFeedbackController extends SceneControllerAbstract {

    override async update(): Promise<void> {


    }

    override async stop(): Promise<void> {


    }

    override async destroy(): Promise<void> {

    }

    override onEvent(event: AvatarBodyEvent): void {
        if (event.name == "LEFT_HAND_UP_ON") {
            ModuloSonido.play('/assets/sounds/on1.mp3', false);
        } else if (event.name == "HANDS_JOINED_ON") {
            ModuloSonido.play('/assets/sounds/clap.mp3', false);
        } else if (event.name == "T_POSE_ON") {
            ModuloSonido.play('/assets/sounds/bang.mp3', false);
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
            ModuloSonido.play('/assets/sounds/off.mp3', false);
        }
    }
}