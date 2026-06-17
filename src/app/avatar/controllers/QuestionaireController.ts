import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { AvatarBodyEvent, ControllerUpdateResponse } from "@mytypes/BodyTypes";

export class QuestionaireController extends SceneControllerAbstract {

    currentStep: number = 0;

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
        if (!this.scenario) {
            return;
        }
        const steps = this.scenario.steps;
        if (!steps) {
            return;
        }
        if (this.currentStep >= steps.length) {
            return;
        }
        const actualStep = steps[this.currentStep];

        await this.setHudText("top", actualStep.label, true);

        const opL = actualStep.options[0];
        const opR = actualStep.options[1];

        await this.setHudText("left", opL.label, true);
        await this.setHudText("right", opR.label, true);
        this.setHudText("bottom", "");
        this.setCubeVisibility(true);
    }

    async clearAll() {
        this.setHudText("top", "");
        this.setHudText("left", "");
        this.setHudText("right", "");
        this.setHudText("bottom", "");
        this.setCubeVisibility(false);
    }

    override onEvent(event: AvatarBodyEvent): void {
        if (event.name == "START_ALL") {
            // Read mode and scenario
            this.initializeQuestion();
        } else if (event.name == "STOP_ALL") {
            this.clearAll();
        } else if (event.name == "CUBE_A_SELECT_ON") {
            // Selected option
            
        } else if (event.name == "CUBE_B_SELECT_ON") {
            // Selected option
            
        }
    }
}