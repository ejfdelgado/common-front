import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CommandConfigType, RecognizedWordId, VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { IndicatorService } from "@services/indicator.service";
import { CommonSpeech } from "../commonSpeech";
import { BooleanStateService } from "@services/boolean-state.service";
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  standalone: true,
  selector: 'app-read',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
  ],
  templateUrl: './speech.html',
  styleUrl: './speech.scss',
})
export class Speech extends CommonSpeech {

  constructor(
    public cdr: ChangeDetectorRef,
    public override voiceSrv: VoiceRecognitionService,
    public override speechSrv: SpeechSynthesisService,
    public override indicatorSrv: IndicatorService,
    public override booleanService: BooleanStateService,
    public override sanitizer: DomSanitizer,
  ) {
    super(voiceSrv, speechSrv, indicatorSrv, booleanService, sanitizer);
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
      if (this.adjustWords()) {
        this.cdr.detectChanges();
      }
    }, 1000);

    const addWordFun = (input: RecognizedWordId) => {
      this.words.push({
        word: input.word,
        time: input.timestamp,
        id: input.id,
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



  async ngOnInit() {
    const promise = this.indicatorSrv.start();
    await this.speechSrv.init();
    promise.done();
  }
}