import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CommandConfigType, RecognizedWord, VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { distinctUntilChanged, filter, map } from 'rxjs';
import { IndicatorService } from "@services/indicator.service";
import { ThreejsComponent } from "./threejs/threejs.component";
import { CommonSpeech, SelectOptionType } from "../commonSpeech";
import { BooleanStateService } from "@services/boolean-state.service";

@Component({
  selector: 'app-game-lr',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    ThreejsComponent,
  ],
  templateUrl: './game-lr.html',
  styleUrl: './game-lr.scss',
})
export class GameLr extends CommonSpeech {
  @ViewChild("three_component") threeComponent!: ThreejsComponent;

  constructor(
    public cdr: ChangeDetectorRef,
    public override voiceSrv: VoiceRecognitionService,
    public override speechSrv: SpeechSynthesisService,
    public override indicatorSrv: IndicatorService,
    public override booleanService: BooleanStateService,
  ) {
    super(voiceSrv, speechSrv, indicatorSrv, booleanService);
    this.voiceSrv.setInterimResults(true);
    this.voiceSrv.setContinuous(false);

    const config: CommandConfigType = {
      confidenceMin: 0.5,
      maxDiffMillis: 600,

      commands: {
        "es-ES": {
          "izquierda": "left",
          //
          "derecha": "right",
          //
          "arriba": "up",
          "adelante": "up",
          "frente": "up",
          //
          "abajo": "down",
          "atras": "down",
          "deatras": "down",
          "reversa": "down",
        },
        "en-US": {
          "left": "left",
          //
          "right": "right",
          "write": "right",
          //
          "up": "up",
          "front": "up",
          "frontward": "up",
          //
          "down": "down",
          "back": "down",
          "bach": "down",
          "backward": "down",
          "reverse": "down",
        },
        "fr-FR": {
          "gauche": "left",
          //
          "droite": "right",
          "droit": "right",
          "adroit": "right",
          //
          "haut": "up",
          "avant": "up",
          "devant": "up",
          "avance": "up",
          "vents": "up",
          "ventes": "up",
          "vins": "up",
          "devin": "up",
          //
          "bas": "down",
          "arriere": "down",
          "derriere": "down",
        }
      },
    };
    const { word$, command$ } = this.voiceSrv.singleWordConnect(config);

    setInterval(() => {
      this.adjustWords();
    }, 1000);

    const addWordFun = (input: RecognizedWord) => {
      this.words.push({
        word: input.word,
        time: input.timestamp,
        color: this.getNextColor(),
      });
      this.adjustWords();
      this.cdr.detectChanges();
    };

    word$.subscribe(addWordFun);
    command$.subscribe((command) => {
      this.threeComponent.executeCommand(command);
    });
    //this.voiceSrv.recognizedWord$.subscribe(addWordFun);
  }

  adjustWords() {
    const MAX_NUMBER_OF_WORDS = 5;
    const THRESHOLD_MS = 10000;//10 seconds
    const now = Date.now();
    const initialLen = this.words.length;
    // First limite number of words
    this.words.splice(0, Math.max(0, this.words.length - MAX_NUMBER_OF_WORDS));
    // Second erase old words
    this.words = this.words.filter((word) => {
      return now - word.time < THRESHOLD_MS;
    });
    if (initialLen != this.words.length) {
      this.cdr.detectChanges();
    }
  }

  async ngOnInit() {
    const promise = this.indicatorSrv.start();
    await this.speechSrv.init();
    promise.done();
  }
}
