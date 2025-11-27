import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CommandConfigType, RecognizedWord, VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { distinctUntilChanged, filter, map } from 'rxjs';
import { IndicatorService } from "@services/indicator.service";
import { CommonSpeech, SelectOptionType } from "../commonSpeech";

@Component({
  standalone: true,
  selector: 'app-read',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
  ],
  templateUrl: './read.html',
  styleUrl: './read.scss',
})
export class Read extends CommonSpeech {

  constructor(
    public cdr: ChangeDetectorRef,
    public override voiceSrv: VoiceRecognitionService,
    public override speechSrv: SpeechSynthesisService,
    public override indicatorSrv: IndicatorService,
  ) {
    super(voiceSrv, speechSrv, indicatorSrv);
    this.voiceSrv.setInterimResults(true);
    this.voiceSrv.setContinuous(false);
    const config: CommandConfigType = {
      confidenceMin: 0.5,
      maxDiffMillis: 600,

      commands: {
        "es-ES": {
          "ayuda": "help",
        },
        "en-US": {
          "help": "help",
        },
        "fr-FR": {
          "aide": "help",//bug don't work aide-moi
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
      console.log(command);
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