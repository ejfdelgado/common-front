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

    setHudText(key: string, val: string) {
        this.cursorDisplay?.setHudDisplay({ key: key, value: val, });
    }

    override onEvent(event: AvatarBodyEvent): void {
        if (event.name == "START_ALL") {
            this.setCubeVisibility(true);
            this.setHudText("top", "Hola");
            this.setHudText("left", "Opción 1");
            this.setHudText("right", "Opción 2");
            this.setHudText("bottom", "Cierre");
        } else if (event.name == "STOP_ALL") {
            this.setCubeVisibility(false);
        }
    }
}