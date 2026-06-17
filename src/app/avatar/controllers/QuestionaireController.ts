import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { AvatarBodyEvent, ControllerUpdateResponse } from "@mytypes/BodyTypes";
import { ModuloSonido } from "src/app/services/sonido.service";
import { shuffleInPlace } from "src/app/tools/ArrayUtil";
import { GameStep, GameStepOption } from "src/types/WorldAvatar";

export class QuestionaireController extends SceneControllerAbstract {

    steps: GameStep[] = [];
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

        if (this.currentStep == 0) {
            this.steps = JSON.parse(JSON.stringify(steps));
            //suffle
            shuffleInPlace(this.steps);
            this.steps.forEach((step) => {
                shuffleInPlace(step.options);
            });
        }

        const actualStep = this.steps[this.currentStep];

        await this.setHudText("top", actualStep.label, true);

        const opR = actualStep.options[1];
        const opL = actualStep.options[0];

        this.optionsMap = {
            "A": opR,
            "B": opL,
        };

        await this.setHudText("right", opR.label, true);
        await this.setHudText("left", opL.label, true);

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
        this.setCubeVisibility(false);
        const op = this.optionsMap[choice];
        // Celebrate, increment points!
        if (op.points == 0) {
            await ModuloSonido.play('/assets/sounds/loose.mp3', false);
        } else {
            await ModuloSonido.play('/assets/sounds/success.mp3', false);
        }
        await this.setHudText("bottom", op.answer, true);
        // Go to next question
        this.currentStep += 1;
        this.initializeQuestion();
    }

    override onEvent(event: AvatarBodyEvent): void {
        if (event.name == "START_ALL") {
            // Read mode and scenario
            this.currentStep = 0;
            this.initializeQuestion();
        } else if (event.name == "STOP_ALL") {
            this.clearAll();
            this.currentStep = 0;
        } else if (event.name == "CUBE_A_SELECT_ON") {
            // Selected option
            this.evaluateAnswer("A");
        } else if (event.name == "CUBE_B_SELECT_ON") {
            // Selected option
            this.evaluateAnswer("B");
        }
    }
}