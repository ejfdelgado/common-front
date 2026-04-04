import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CommandConfigType, RecognizedWordId, VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { tap } from 'rxjs';
import { IndicatorService } from "@services/indicator.service";
import { CommonSpeech, SelectOptionType } from "../commonSpeech";
import { BooleanStateService } from "@services/boolean-state.service";
import { distinctUntilKeyChangedWithTTL } from '@tools/rxjsUtils';
import { ModuloSonido } from '@services/sonido.service';
import { getBucketFilePath } from '@tools/BucketPaths';
import { DomSanitizer } from '@angular/platform-browser';
import { FullscreenService } from '@services/fullscreen.service';

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
      matches: { "en-US": ["clap"] },
      soundUrl: "sounds/claps.mp3",
    },
    {
      id: "city",
      matches: { "en-US": ["big city"] },
      soundUrl: "sounds/city.mp3",
    },
    {
      id: "earthquake",
      matches: { "en-US": ["earthquake"] },
      soundUrl: "sounds/earthquake.mp3",
    },
    {
      id: "nature",
      matches: { "en-US": ["nature"] },
      soundUrl: "sounds/nature.mp3",
    },
    {
      id: "explosion",
      matches: { "en-US": ["explosion"] },
      soundUrl: "sounds/explosion.mp3",
    },
    {
      id: "wolf",
      matches: { "en-US": ["wolf", "howl"] },
      soundUrl: "sounds/wolf.mp3",
    },
    {
      id: "rain",
      matches: { "en-US": ["rain"] },
      soundUrl: "sounds/rain.mp3",
    },
    {
      id: "laughts",
      matches: { "en-US": ["people laugh"] },
      soundUrl: "sounds/laughts.mp3",
    },
    {
      id: "circus",
      matches: { "en-US": ["circus"] },
      soundUrl: "sounds/circus.mp3",
    },
  ]

  constructor(
    public cdr: ChangeDetectorRef,
    public override voiceSrv: VoiceRecognitionService,
    public override speechSrv: SpeechSynthesisService,
    public override indicatorSrv: IndicatorService,
    public override booleanService: BooleanStateService,
    public override sanitizer: DomSanitizer,
    public override fullScreenSrv: FullscreenService,
  ) {
    super(voiceSrv, speechSrv, indicatorSrv, booleanService, sanitizer, fullScreenSrv, "en-US");
    this.voiceSrv.setInterimResults(true);
    this.voiceSrv.setContinuous(false);

    const config: CommandConfigType = {
      confidenceMin: 0.5,
      maxDiffMillis: 600,
      type: "phrase",
      commands: {
        "es-ES": {
          "silencio": "stop",
        },
        "en-US": {
          "stop": "stop",
          "silent": "stop",
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
        if (command.command == "stop") {
          ModuloSonido.stopAll();
        } else {
          const sound = this.getSoundById(command.command);
          if (sound) {
            //console.log(JSON.stringify(sound));
            ModuloSonido.play(getBucketFilePath(sound.soundUrl));
          }
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