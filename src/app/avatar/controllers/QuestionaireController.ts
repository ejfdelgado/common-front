import { SceneControllerAbstract } from '@avatar/controllers/SceneControllerAbstract';
import { AvatarBodyEvent, ControllerUpdateResponse } from '@mytypes/BodyTypes';
import { ModuloSonido } from 'src/app/services/sonido.service';
import { shuffleInPlace } from 'src/app/tools/ArrayUtil';
import { BUCKET_ROOT, GameScenario, GameStep, GameStepOption } from 'src/types/WorldAvatar';
import { ENABLE_CUBE_TYPE, MinMaxCubeRange } from './CubeController';

const MAX_LIFE = 5;

const FAR_AMOUNT_X = 0;
const FAR_AMOUNT_Y = 0;

const X_MIN = 0.6;
const X_MAX = X_MIN + 1 * FAR_AMOUNT_X;
const Y_MIN = 0.3 * FAR_AMOUNT_Y;
const Y_MAX = 0.4 * FAR_AMOUNT_Y;
const Y_MIN_BOTTOM = -0.8;
const Y_MAX_BOTTOM = -0.8 + 0.3 * FAR_AMOUNT_Y;

const SIDE_FRONT = 0.3;

const VERTICAL_SHIFT = -0.8; //-0.5

const MAX_QUESTIONS_DEF = 10;

export interface LettersConfig {
  id: string;
  cube_id: string;
  hud_id: string;
  minmax?: MinMaxCubeRange;
}

const TRANSLATION: any = {
  'es-ES': {
    question: 'Pregunta',
    of: 'de',
  },
  'en-US': {
    question: 'Question',
    of: 'of',
  },
  'fr-FR': {
    question: 'Question',
    of: 'sur',
  },
};

export class QuestionaireController extends SceneControllerAbstract {
  isPlaying: boolean = false;
  score: number = 0;
  life: number = MAX_LIFE;
  steps: GameStep[] = [];
  currentStep: number = 0;
  optionsMap: { [key: string]: GameStepOption } = {};
  maxQuestions: number = MAX_QUESTIONS_DEF;

  override async update(): Promise<ControllerUpdateResponse> {
    return {};
  }
  override async stop(): Promise<void> {}
  override async destroy(): Promise<void> {}

  override setScenario(scenario: GameScenario) {
    super.setScenario(scenario);
    this.preloadAudios();
  }

  randomize(min: number, max: number) {
    const rand = Math.random();
    const inverse = 1 - rand;
    return rand * min + inverse * max;
  }

  getDictionary() {
    let pred = 'es-ES';
    if (this.scenario?.language) {
      pred = this.scenario?.language;
    }
    return TRANSLATION[pred];
  }

  hideAllCubes() {
    this.events.emit({ name: 'CUBE_CONTROLL_OFF' });
    this.events.emit({ name: 'CUBE_LISTEN_OFF' });
  }

  enableCube(
    name: ENABLE_CUBE_TYPE,
    data: {
      minmax?: MinMaxCubeRange;
      rotationPeriod?: number;
    },
  ) {
    const payload = { name: name, data };
    this.events.emit(payload);
  }

  async setHudValue(key: string, val: any, speak?: boolean) {
    await this.cursorDisplay?.setHudDisplay({
      key: key,
      value: val,
      speak: speak,
    });
  }

  async preloadAudios() {
    const audios: string[] = [];
    if (this.scenario?.audio) {
      const audioKeys = ['intro', 'loop', 'finish', 'loose', 'success'];
      for (let i = 0; i < audioKeys.length; i++) {
        const audioKey = audioKeys[i];
        const val = (this.scenario.audio as any)[audioKey];
        if (val) {
          audios.push(BUCKET_ROOT + val);
        }
      }
    }
    await ModuloSonido.preload(audios);
  }

  async playAudio(type: 'intro' | 'loop' | 'finish' | 'loose' | 'success') {
    if (!this.scenario?.audio) {
      return { promise: Promise.resolve() };
    }
    const val = (this.scenario?.audio as any)[type];
    if (!val) {
      return { promise: Promise.resolve() };
    }
    ModuloSonido.stopAll();
    return await ModuloSonido.play(BUCKET_ROOT + val, type == 'loop');
  }

  async initializeQuestion() {
    const dict = this.getDictionary();
    this.clearAll();
    if (!this.scenario) {
      return;
    }
    const steps = this.scenario.steps;
    const stepsConfig = this.scenario.stepsConfig;
    if (!steps) {
      return;
    }
    if (this.currentStep >= steps.length) {
      await this.youWin();
      return;
    }

    if (this.currentStep == 0) {
      if (typeof stepsConfig?.maxQuestions == 'number') {
        this.maxQuestions = stepsConfig.maxQuestions;
      }
      this.steps = JSON.parse(JSON.stringify(steps));
      //suffle
      shuffleInPlace(this.steps);
      this.steps.forEach((step) => {
        shuffleInPlace(step.options);
      });
      const { promise } = await this.playAudio('intro');
      let introTitle = 'Game Start!';
      if (stepsConfig?.introTitle) {
        introTitle = stepsConfig.introTitle;
      }
      await this.setHudValue('top', `<h2>${introTitle}</h2>`, false);
      await promise;
    }

    // Check if won
    if (this.currentStep >= this.maxQuestions) {
      await this.youWin();
      return;
    }

    const actualStep = this.steps[this.currentStep];

    await this.setHudValue(
      'top',
      `${dict['question']} ${this.currentStep + 1} ${dict['of']} ${this.maxQuestions}.</br>` +
        actualStep.label,
      true,
    );
    if (!this.isPlaying) {
      return;
    }

    let LETTERS: LettersConfig[] = [
      {
        id: 'A',
        cube_id: 'CUBE_A_ON',
        hud_id: 'right',
        minmax: {
          x: { min: X_MIN, max: X_MAX },
          y: { min: -1 * Y_MIN, max: Y_MAX },
          z: { min: SIDE_FRONT, max: SIDE_FRONT },
        },
      },
      {
        id: 'B',
        cube_id: 'CUBE_B_ON',
        hud_id: 'left',
        minmax: {
          x: { min: -1 * X_MIN, max: -1 * X_MAX },
          y: { min: -1 * Y_MIN, max: Y_MAX },
          z: { min: SIDE_FRONT, max: SIDE_FRONT },
        },
      },
      {
        id: 'C',
        cube_id: 'CUBE_C_ON',
        hud_id: 'right_bottom',
        minmax: {
          x: { min: X_MIN, max: X_MAX },
          y: { min: Y_MIN_BOTTOM, max: Y_MAX_BOTTOM },
          z: { min: 0, max: 0 },
        },
      },
      {
        id: 'D',
        cube_id: 'CUBE_D_ON',
        hud_id: 'left_bottom',
        minmax: {
          x: { min: -1 * X_MIN, max: -1 * X_MAX },
          y: { min: Y_MIN_BOTTOM, max: Y_MAX_BOTTOM },
          z: { min: 0, max: 0 },
        },
      },
    ];

    /*
        LETTERS = LETTERS.filter((a) => {
            return (["A", "B"].indexOf(a.id) >= 0);
        });
        */

    shuffleInPlace(LETTERS);

    this.optionsMap = {};

    this.events.emit({ name: 'CUBE_CONTROLL_ON' });
    for (let i = 0; i < actualStep.options.length; i++) {
      const option = actualStep.options[i];
      const letter = LETTERS[i];
      this.optionsMap[letter.id] = option;
      const direction = this.randomize(0, 10) > 5 ? 1 : -1;
      this.enableCube(letter.cube_id as ENABLE_CUBE_TYPE, {
        minmax: letter.minmax,
        //rotationPeriod: direction * this.randomize(2000, 5000),
      });
      await this.setHudValue(letter.hud_id, option.label, true);
      if (!this.isPlaying) {
        return;
      }
    }
    this.events.emit({ name: 'CUBE_LISTEN_ON' });
  }

  resetGame() {
    this.currentStep = 0;
    this.life = MAX_LIFE;
    this.score = 0;
    this.setHudValue('life', this.life);
    this.setHudValue('score', this.score);
    this.clearAll();
  }

  clearAll() {
    this.setHudValue('top', '');
    this.setHudValue('left', '');
    this.setHudValue('right', '');
    this.setHudValue('left_bottom', '');
    this.setHudValue('right_bottom', '');
    this.setHudValue('bottom', '');
    this.hideAllCubes();
  }

  async evaluateAnswer(choice: string) {
    this.hideAllCubes();
    this.enableCube(('CUBE_' + choice + '_ON') as ENABLE_CUBE_TYPE, {});
    const op = this.optionsMap[choice];
    if (!op) {
      console.log(`No option for choice ${choice}`);
      return;
    }
    if (op.points == 0) {
      // Loose lives
      this.life -= 1;
      this.setHudValue('life', this.life);
      if (this.life == 0) {
        const { promise } = await this.playAudio('loose');
        await this.gameOver();
        return;
      }
      const { promise } = await this.playAudio('loose');
      await promise;
    } else {
      // Celebrate, increment points!
      this.score += op.points * 10;
      this.setHudValue('score', this.score);
      const { promise } = await this.playAudio('success');
      await promise;
    }
    if (!this.isPlaying) {
      return;
    }
    await this.setHudValue('bottom', op.answer, true);
    // Go to next question
    this.currentStep += 1;
    if (!this.isPlaying) {
      return;
    }
    this.initializeQuestion();
  }

  async gameOver() {
    this.clearAll();
    let label = 'Game Over';
    if (this.scenario && this.scenario.stepsConfig && this.scenario.stepsConfig.looseLabel) {
      label = this.scenario.stepsConfig.looseLabel;
    }
    await this.setHudValue('bottom', `<h2>${label}</h2>`, false);
  }

  async youWin() {
    this.clearAll();
    let label = 'You Win';
    if (this.scenario && this.scenario.stepsConfig && this.scenario.stepsConfig.winLabel) {
      label = this.scenario.stepsConfig.winLabel;
    }
    const { promise } = await this.playAudio('finish');
    await this.setHudValue('top', `<h2>${label}</h2>`, false);
    await promise;
  }

  override onEvent(event: AvatarBodyEvent): void {
    if (event.name == 'START_ALL') {
      // Read mode and scenario
      this.isPlaying = true;
      this.resetGame();
      this.initializeQuestion();
    } else if (event.name == 'STOP_ALL') {
      this.isPlaying = false;
      this.resetGame();
    } else if (event.name == 'CUBE_A_SELECT_ON') {
      // Selected option
      this.evaluateAnswer('A');
    } else if (event.name == 'CUBE_B_SELECT_ON') {
      // Selected option
      this.evaluateAnswer('B');
    } else if (event.name == 'CUBE_C_SELECT_ON') {
      // Selected option
      this.evaluateAnswer('C');
    } else if (event.name == 'CUBE_D_SELECT_ON') {
      // Selected option
      this.evaluateAnswer('D');
    }
  }
}
