import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { AvatarBodyEvent, ControllerUpdateResponse } from "@mytypes/BodyTypes";
import { ModuloSonido } from "src/app/services/sonido.service";
import { shuffleInPlace } from "src/app/tools/ArrayUtil";
import { GameStep, GameStepOption } from "src/types/WorldAvatar";

const MAX_LIFE = 5;

export class QuestionaireController extends SceneControllerAbstract {

    isPlaying: boolean = false;
    score: number = 0;
    life: number = MAX_LIFE;
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

    hideAllCubes() {
        this.events.emit({ name: "CUBE_CONTROLL_OFF", });
    }

    enableCube(name: "CUBE_A_ON" | "CUBE_B_ON" | "CUBE_C_ON" | "CUBE_D_ON") {
        this.events.emit({ name: "CUBE_CONTROLL_ON", });
        this.events.emit({ name: name, });
    }

    async setHudValue(key: string, val: any, speak?: boolean) {
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

        await this.setHudValue("top", actualStep.label, true);
        if (!this.isPlaying) { return; }

        const opR = actualStep.options[1];
        const opL = actualStep.options[0];

        this.optionsMap = {
            "A": opR,
            "B": opL,
        };

        this.enableCube("CUBE_A_ON");
        await this.setHudValue("right", opR.label, true);
        if (!this.isPlaying) { return; }


        this.enableCube("CUBE_B_ON");
        await this.setHudValue("left", opL.label, true);
        if (!this.isPlaying) { return; }


    }

    resetGame() {
        this.currentStep = 0;
        this.life = MAX_LIFE;
        this.score = 0;
        this.setHudValue("life", this.life);
        this.setHudValue("score", this.score);
        this.clearAll();
    }

    clearAll() {
        this.setHudValue("top", "");
        this.setHudValue("left", "");
        this.setHudValue("right", "");
        this.setHudValue("left_bottom", "");
        this.setHudValue("right_bottom", "");
        this.setHudValue("bottom", "");
        this.hideAllCubes();
    }

    async evaluateAnswer(choice: string) {
        this.hideAllCubes();
        const op = this.optionsMap[choice];
        if (op.points == 0) {
            // Loose lives
            this.life -= 1;
            this.setHudValue("life", this.life);
            if (this.life == 0) {
                await ModuloSonido.play('/assets/sounds/loose.mp3', false);
                await this.gameOver();
                return;
            }
            await ModuloSonido.play('/assets/sounds/loose.mp3', false);
        } else {
            // Celebrate, increment points!
            this.score += op.points * 10;
            this.setHudValue("score", this.score);
            await ModuloSonido.play('/assets/sounds/success.mp3', false);
        }
        if (!this.isPlaying) { return; }
        await this.setHudValue("bottom", op.answer, true);
        // Go to next question
        this.currentStep += 1;
        if (!this.isPlaying) { return; }
        this.initializeQuestion();
    }

    async gameOver() {
        this.clearAll();
        await this.setHudValue("bottom", "Fin del juego", true);
    }

    override onEvent(event: AvatarBodyEvent): void {
        if (event.name == "START_ALL") {
            // Read mode and scenario
            this.isPlaying = true;
            this.resetGame();
            this.initializeQuestion();
        } else if (event.name == "STOP_ALL") {
            this.isPlaying = false;
            this.resetGame();
        } else if (event.name == "CUBE_A_SELECT_ON") {
            // Selected option
            this.evaluateAnswer("A");
        } else if (event.name == "CUBE_B_SELECT_ON") {
            // Selected option
            this.evaluateAnswer("B");
        }
    }
}