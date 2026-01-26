import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CommandConfigType, RecognizedWord, RecognizedWordId, VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { distinctUntilChanged, distinctUntilKeyChanged, filter, map, tap } from 'rxjs';
import { IndicatorService } from "@services/indicator.service";
import { CommonSpeech, SelectOptionType } from "../commonSpeech";
import { BooleanStateService } from "@services/boolean-state.service";
import { distinctUntilKeyChangedWithTTL } from '@tools/rxjsUtils';
import { ModuloSonido } from '@services/sonido.service';
import { getBucketFilePath } from '@tools/BucketPaths';

export interface SoundDataType {
  id: string;
  matches: { [key: string]: string[] };
  soundUrl: string;
}

@Component({
  standalone: true,
  selector: 'app-playsound',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
  ],
  templateUrl: './playsound.html',
  styleUrl: './playsound.scss',
})
export class Playsound extends CommonSpeech {

  database: SoundDataType[] = [
    {
      id: "claps",
      matches: { "en-US": ["claps"] },
      soundUrl: "sounds/claps.mp3",
    },
    {
      id: "city",
      matches: { "en-US": ["city"] },
      soundUrl: "sounds/city.mp3",
    },
    {
      id: "earthquake",
      matches: { "en-US": ["earthquake"] },
      soundUrl: "sounds/earthquake.mp3",
    },
  ]

  constructor(
    public cdr: ChangeDetectorRef,
    public override voiceSrv: VoiceRecognitionService,
    public override speechSrv: SpeechSynthesisService,
    public override indicatorSrv: IndicatorService,
    public override booleanService: BooleanStateService,
  ) {
    super(voiceSrv, speechSrv, indicatorSrv, booleanService, "en-US");
    this.voiceSrv.setInterimResults(true);
    this.voiceSrv.setContinuous(false);

    const config: CommandConfigType = {
      confidenceMin: 0.5,
      maxDiffMillis: 600,
      type: "phrase",
      commands: {
        "es-ES": {

        },
        "en-US": {

        },
        "fr-FR": {

        }
      },
    };

    // Fill database
    for (let i = 0; i < this.database.length; i++) {
      const entry = this.database[i];
      const { id, matches } = entry;
      const langs = Object.keys(matches);
      for (let j = 0; j < langs.length; j++) {
        const lang = langs[j];
        const phrases = matches[lang];
        for (let k = 0; k < phrases.length; k++) {
          const phrase = phrases[k];
          //console.log(id, lang, phrase);
          config.commands[lang][phrase] = id;
        }
      }
    }

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
    command$.pipe(
      distinctUntilKeyChangedWithTTL('command', 500),
      tap((command) => {
        const sound = this.getSoundById(command.command);
        if (sound) {
          //console.log(JSON.stringify(sound));
          ModuloSonido.play(getBucketFilePath(sound.soundUrl));
        }
      }),
    ).subscribe();
    //this.voiceSrv.recognizedWord$.subscribe(addWordFun);
  }

  getSoundById(id: string) {
    const filtered = this.database.filter((el) => el.id == id);
    if (filtered.length == 0) {
      return null;
    } else {
      return filtered[0];
    }
  }

  async ngOnInit() {
    const promise = this.indicatorSrv.start();
    await this.speechSrv.init();
    promise.done();
  }
}