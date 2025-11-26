import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CommandConfigType, RecognizedWord, VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { distinctUntilChanged, filter, map } from 'rxjs';
import { IndicatorService } from "@services/indicator.service";
import { CommonSpeech, SelectOptionType } from "../commonSpeech";
import { ModuloSonido } from '@services/sonido.service';

const ROOT_PATH = "https://storage.googleapis.com/pro-ejflab-assets/songs/";

export interface Verse {
  txt: string;
  selected?: boolean;
  millis?: number;
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
  isPlaying: boolean = false;
  millisStartTime: number = 0;
  millisTime: number = 0;
  cronoInterval: NodeJS.Timeout | null = null;
  langs: SelectOptionType[] = [
    { id: "es-ES", label: "Español", icon: "🇪🇸" },
    { id: "en-US", label: "English", icon: "🇺🇸" },
    { id: "fr-FR", label: "Français", icon: "🇫🇷" },
  ];

  song: Verse[] = [
    { txt: "🎵", millis: 1 },
    { txt: "you could be the greatest 🏆", millis: 22150 },
    { txt: "you can be the best 🥇", millis: 23500 },
    { txt: "you can be the king kong 🦍 bangin on your chest", millis: 24800 },
    { txt: "you can beat the world 🌍", millis: 27600 },
    { txt: "you can beat the war 💣", millis: 29200 },
    { txt: "you can talk to God 👑", millis: 30600 },
    { txt: "go bangin on his door 🚪", millis: 31600 },
    { txt: "you can throw your hands up", millis: 33400 },
    { txt: "you can beat the clock", millis: 34800 },
    { txt: "you can move a mountain", millis: 36200 },
    { txt: "you can break rocks", millis: 37800 },
    { txt: "you can be a master", millis: 39000 },
    { txt: "don't wait for luck", millis: 40401 },
    { txt: "dedicate yourself", millis: 41801 },
    { txt: "and you gon find yourself", millis: 42802 },
    { txt: "...", millis: 43800 },
    { txt: "standing in the hall of fame", millis: 43802 },
    { txt: "and the world's gonna know your name", millis: 49002 },
    { txt: "cause you burn with the brightest flame", millis: 54602 },
    { txt: "and the world's gonna know your name", millis: 60203 },
    { txt: "and you'll be on the walls of the hall of fame", millis: 64603 },
    { txt: "...", millis: 67602 },
    { txt: "you can go the distance", millis: 67350 },
    { txt: "you can run de mile", millis: 68750 },
    { txt: "you can walk straight", millis: 70150 },
    { txt: "through hell with a smile", millis: 71000 },
    { txt: "you can be a hero", millis: 72951 },
    { txt: "you can get the gold", millis: 74350 },
    { txt: "breaking all the records", millis: 75550 },
    { txt: "they thought never could be broke", millis: 76751 },
    { txt: "do it for your people", millis: 78500 },
    { txt: "do it for your pride", millis: 80000 },
    { txt: "how are you ever gonna know?", millis: 81001 },
    { txt: "if you never even try", millis: 82401 },
    { txt: "do it for your country", millis: 83901 },
    { txt: "do it for your name", millis: 85701 },
    { txt: "cause there's gon' be a day", millis: 87001 },
    { txt: "when you're", millis: 88802 },
    { txt: "...", millis: 89200},
    { txt: "standing in the hall of fame", millis: 89202},
    { txt: "and the world's gonna know your name", millis: 93602},
    { txt: "cause you burn with the brightest flame", millis: 99602},
    { txt: "and the world's gonna know your name", millis: 105202},
    { txt: "and you'll be on the walls of the hall of fame", millis: 109802},
    { txt: "...", millis: 112600},
    { txt: "be a champion", millis: 112602},
    { txt: "be a champion", millis: 115202},
    { txt: "be a champion", millis: 118002},
    { txt: "be a champion", millis: 121202},
    { txt: "...", millis: 124400},
    { txt: "be students, be teachers", millis: 124403},
    { txt: "be politicians, be preachers", millis: 126403},
    { txt: "be believers, be leaders", millis: 130403},
    { txt: "be astronauts, be champions", millis: 132204},
    { txt: "be truth seekers", millis: 134404},
    { txt: "be students, be teachers", millis: 135804},
    { txt: "be politicians, be preachers", millis: 137900},
    { txt: "be believers, be leaders", millis: 141500},
    { txt: "be astronauts, be champions", millis: 143600},
    { txt: "...", millis: 145550},
    { txt: "standing in the hall of fame", millis: 145600},
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

  async playVerse(event: MouseEvent, verse: Verse) {
    event.stopPropagation();
    if (typeof verse.millis == "number") {
      this.startSong(verse.millis);
    } else {
      verse.selected = true;
      this.cdr.detectChanges();
      await this.talk(verse.txt);
      verse.selected = false;
      this.cdr.detectChanges();
    }
  }

  async startSong(startingPoint: number) {
    const promise = this.indicatorSrv.start();
    await ModuloSonido.play(ROOT_PATH + "hall_of_fame.mp3", false, 1, startingPoint);
    promise.done();
    this.isPlaying = true;
    this.cdr.detectChanges();
    this.millisStartTime = Date.now() - startingPoint;
    this.resetInterval();
    this.cronoInterval = setInterval(() => {
      this.millisTime = Date.now() - this.millisStartTime;
      this.computeCurrentVerse();
      this.cdr.detectChanges();
    }, 200);
  }

  async stopSong() {
    ModuloSonido.stop(ROOT_PATH + "hall_of_fame.mp3");
    this.isPlaying = false;
    this.resetInterval();
  }

  resetInterval() {
    if (this.cronoInterval) {
      clearInterval(this.cronoInterval);
      this.cronoInterval = null;
    }
  }

  computeCurrentVerse() {
    // Clear all verses
    const song = this.song;
    let last: Verse | null = null;
    for (let i = 0; i < song.length; i++) {
      const actual = song[i];
      if (actual.millis !== undefined && actual.millis < this.millisTime) {
        last = actual;
      }
      actual.selected = false;
    }
    if (last) {
      last.selected = true;
    }
  }

  toggleSong() {
    if (this.isPlaying) {
      this.stopSong();
    } else {
      this.startSong(this.millisTime);
    }
  }
}