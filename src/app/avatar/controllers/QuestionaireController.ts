import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { AvatarBodyEvent, ControllerUpdateResponse } from "@mytypes/BodyTypes";

export class QuestionaireController extends SceneControllerAbstract {

    override async update(): Promise<ControllerUpdateResponse> {

        return {};
    }
    override async stop(): Promise<void> {

    }
    override async destroy(): Promise<void> {

    }

    setCubeVisibility(val: boolean) {
        if (val) {
            this.events.emit({ name: "CUBE_CONTROLL_ON", });
        } else {
            this.events.emit({ name: "CUBE_CONTROLL_OFF", });
        }
    }

    async setHudText(key: string, val: string, speak?: boolean) {
        await this.cursorDisplay?.setHudDisplay({ key: key, value: val, speak: speak });
    }

    async initializeQuestion() {
        await this.setHudText("top", "Hola", true);
        await this.setHudText("left", "Opción 1", true);
        await this.setHudText("right", "Opción 2", true);
        //this.setHudText("bottom", "Cierre",);
        this.setCubeVisibility(true);
    }

    override onEvent(event: AvatarBodyEvent): void {
        if (event.name == "START_ALL") {
            // Read mode and scenario
            this.initializeQuestion();
        } else if (event.name == "STOP_ALL") {
            this.setCubeVisibility(false);
        } else if (event.name == "CUBE_A_SELECT_ON") {
            // Selected option
        } else if (event.name == "CUBE_B_SELECT_ON") {
            // Selected option
        }
    }
}