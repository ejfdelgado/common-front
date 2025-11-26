import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CommandConfigType, RecognizedWord, VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { distinctUntilChanged, filter, map } from 'rxjs';
import { IndicatorService } from "@services/indicator.service";
import { CommonSpeech, SelectOptionType } from "../commonSpeech";

export interface Verse {
  txt: string;
  selected?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-practicesong',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
  ],
  templateUrl: './practicesong.html',
  styleUrl: './practicesong.scss',
})
export class Practicesong extends CommonSpeech {
  langs: SelectOptionType[] = [
    { id: "es-ES", label: "Español", icon: "🇪🇸" },
    { id: "en-US", label: "English", icon: "🇺🇸" },
    { id: "fr-FR", label: "Français", icon: "🇫🇷" },
  ];

  song: Verse[] = [
    { txt: "you could be the greatest 🏆", },
    { txt: "you can be the best 🥇", },
    { txt: "you can be the king kong 🦍 bangin on your chest", },
    { txt: "you can beat the world 🌍", },
    { txt: "you can beat the war 💣", },
    { txt: "you can talk to God 👑", },
    { txt: "go bangin on his door 🚪", },
    { txt: "you can throw your hands up", },
    { txt: "you can beat the clock", },
    { txt: "you can move a mountain", },
    { txt: "you can break rocks", },
    { txt: "you can be a master", },
    { txt: "don't wait for luck", },
    { txt: "dedicate yourself", },
    { txt: "and you gon find yourself", },
    { txt: "...", },
    { txt: "standing in the hall of fame", },
    { txt: "and the world's gonna know your name", },
    { txt: "cause you burn with the brightest flame", },
    { txt: "and the world's gonna know your name", },
    { txt: "and you'll be on the walls of the hall of fame", },
    { txt: "...", },
    { txt: "you can go the distance", },
    { txt: "you can run de mile", },
    { txt: "you can walk straight", },
    { txt: "through hell with a smile", },
    { txt: "you can be a hero", },
    { txt: "you can get the gold", },
    { txt: "breaking all the records", },
    { txt: "they thought never could be broke", },
    { txt: "do it for your people", },
    { txt: "do it for your pride", },
    { txt: "how are you ever gonna know?", },
    { txt: "if you never even try", },
    { txt: "do it for your country", },
    { txt: "do it for your name", },
    { txt: "cause there's gon' be a day", },
    { txt: "when you're", },
    { txt: "...", },
    { txt: "standing in the hall of fame", },
    { txt: "and the world's gonna know your name", },
    { txt: "cause you burn with the brightest flame", },
    { txt: "and the world's gonna know your name", },
    { txt: "and you'll be on the walls of the hall of fame", },
    { txt: "...", },
    { txt: "be a champion", },
    { txt: "be a champion", },
    { txt: "be a champion", },
    { txt: "be a champion", },
    { txt: "...", },
    { txt: "be students, be teachers", },
    { txt: "be politicians, be preachers", },
    { txt: "be believers, be leaders", },
    { txt: "be astronauts, be champions", },
    { txt: "be truth seekers", },
    { txt: "be students, be teachers", },
    { txt: "be politicians, be preachers", },
    { txt: "be believers, be leaders", },
    { txt: "be astronauts, be champions", },
    { txt: "...", },
    { txt: "standing in the hall of fame", },
    { txt: "and the world's gonna know your name", },
    { txt: "cause you burn with the brightest flame", },
    { txt: "and the world's gonna know your name", },
    { txt: "and you'll be on the walls of the hall of fame", },
    { txt: "...", },
    { txt: "you could be the greatest 🏆", },
    { txt: "you can be the best 🥇", },
    { txt: "you can be the king kong 🦍 bangin on your chest", },
    { txt: "you can beat the world 🌍", },
    { txt: "you can beat the war 💣", },
    { txt: "you can talk to God 👑", },
    { txt: "go bangin on his door 🚪", },
    { txt: "you can throw your hands up", },
    { txt: "you can beat the clock", },
    { txt: "you can move a mountain", },
    { txt: "you can break rocks", },
    { txt: "you can be a master", },
    { txt: "don't wait for luck", },
    { txt: "dedicate yourself", },
    { txt: "and you gon find yourself", },
    { txt: "...", },
    { txt: "standing in the hall of fame", },
  ];

  constructor(
    public cdr: ChangeDetectorRef,
    public override voiceSrv: VoiceRecognitionService,
    public override speechSrv: SpeechSynthesisService,
    public override indicatorSrv: IndicatorService,
  ) {
    super(voiceSrv, speechSrv, indicatorSrv, "en-US");
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

  async playVerse(verse: Verse) {
    verse.selected = true;
    this.cdr.detectChanges();
    await this.talk(verse.txt);
    verse.selected = false;
    this.cdr.detectChanges();
  }
}