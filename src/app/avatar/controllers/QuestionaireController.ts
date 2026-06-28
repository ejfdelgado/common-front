import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { AvatarBodyEvent, ControllerUpdateResponse } from "@mytypes/BodyTypes";
import { ModuloSonido } from "src/app/services/sonido.service";
import { shuffleInPlace } from "src/app/tools/ArrayUtil";
import { GameStep, GameStepOption } from "src/types/WorldAvatar";
import { ENABLE_CUBE_TYPE, MinMaxCubeRange } from "./CubeController";

const MAX_LIFE = 5;

const FAR_AMOUNT_X = 1;
const FAR_AMOUNT_Y = 1;

const X_MIN = 0.5;
const X_MAX = 0.5 + 1 * FAR_AMOUNT_X;
const Y_MIN = 0.3 * FAR_AMOUNT_Y;
const Y_MAX = 0.4 * FAR_AMOUNT_Y;
const Y_MIN_BOTTOM = -0.8;
const Y_MAX_BOTTOM = -0.8 + 0.3 * FAR_AMOUNT_Y;

const SIDE_FRONT = 0.3;

const VERTICAL_SHIFT = -0.8;//-0.5

export interface LettersConfig {
    id: string;
    cube_id: string;
    hud_id: string;
    minmax?: MinMaxCubeRange;
}

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
        this.events.emit({ name: "CUBE_LISTEN_OFF", });
    }

    enableCube(name: ENABLE_CUBE_TYPE, data: { minmax?: MinMaxCubeRange }) {
        this.events.emit({ name: name, data });
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

        const LETTERS: LettersConfig[] = [
            {
                id: "A",
                cube_id: "CUBE_A_ON",
                hud_id: "right",
                minmax: {
                    x: { min: X_MIN, max: X_MAX },
                    y: { min: -1 * Y_MIN, max: Y_MAX },
                    z: { min: SIDE_FRONT, max: SIDE_FRONT },
                },
            },
            {
                id: "B",
                cube_id: "CUBE_B_ON",
                hud_id: "left",
                minmax: {
                    x: { min: -1 * X_MIN, max: -1 * X_MAX },
                    y: { min: -1 * Y_MIN, max: Y_MAX },
                    z: { min: SIDE_FRONT, max: SIDE_FRONT },
                },
            },
            {
                id: "C",
                cube_id: "CUBE_C_ON",
                hud_id: "right_bottom",
                minmax: {
                    x: { min: X_MIN, max: X_MAX },
                    y: { min: Y_MIN_BOTTOM, max: Y_MAX_BOTTOM },
                    z: { min: 0, max: 0 },
                },
            },
            {
                id: "D",
                cube_id: "CUBE_D_ON",
                hud_id: "left_bottom",
                minmax: {
                    x: { min: -1 * X_MIN, max: -1 * X_MAX },
                    y: { min: Y_MIN_BOTTOM, max: Y_MAX_BOTTOM },
                    z: { min: 0, max: 0 },
                },
            },
        ];

        shuffleInPlace(LETTERS);

        this.optionsMap = {};

        this.events.emit({ name: "CUBE_CONTROLL_ON", });
        for (let i = 0; i < actualStep.options.length; i++) {
            const option = actualStep.options[i];
            const letter = LETTERS[i];
            this.optionsMap[letter.id] = option;
            this.enableCube(letter.cube_id as ENABLE_CUBE_TYPE, { minmax: letter.minmax });
            await this.setHudValue(letter.hud_id, option.label, true);
            if (!this.isPlaying) { return; }
        }
        this.events.emit({ name: "CUBE_LISTEN_ON", });
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
        if (!op) {
            console.log(`No option for choice ${choice}`);
            return;
        }
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
        } else if (event.name == "CUBE_C_SELECT_ON") {
            // Selected option
            this.evaluateAnswer("C");
        } else if (event.name == "CUBE_D_SELECT_ON") {
            // Selected option
            this.evaluateAnswer("D");
        }
    }
}