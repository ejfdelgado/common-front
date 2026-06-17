import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { AvatarBodyEvent, ControllerUpdateResponse } from "@mytypes/BodyTypes";
import { GameStepOption } from "src/types/WorldAvatar";

export class QuestionaireController extends SceneControllerAbstract {

    currentStep: number = 0;
    optionsMap: { [key: string]: GameStepOption } = {};

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
        this.clearAll();
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

        this.optionsMap = {
            "B": opL,
            "A": opR,
        };

        await this.setHudText("left", opL.label, true);
        await this.setHudText("right", opR.label, true);

        this.setCubeVisibility(true);
    }

    async clearAll() {
        this.setHudText("top", "");
        this.setHudText("left", "");
        this.setHudText("right", "");
        this.setHudText("bottom", "");
        this.setCubeVisibility(false);
    }

    async evaluateAnswer(choice: string) {
        const op = this.optionsMap[choice];
        await this.setHudText("bottom", op.answer, true);
        // Celebrate, increment points!
        // Go to next question
        this.currentStep += 1;
        this.initializeQuestion();
    }

    override onEvent(event: AvatarBodyEvent): void {
        if (event.name == "START_ALL") {
            // Read mode and scenario
            this.initializeQuestion();
        } else if (event.name == "STOP_ALL") {
            this.clearAll();
        } else if (event.name == "CUBE_A_SELECT_ON") {
            // Selected option
            this.evaluateAnswer("A");
        } else if (event.name == "CUBE_B_SELECT_ON") {
            // Selected option
            this.evaluateAnswer("B");
        }
    }
}