import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RecognizedWord, VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs';
import { generateHueColors } from '@tools/Colors';

export interface SelectOptionType {
  id: string;
  label: string;
};

export interface WordType {
  word: string;
  time: number;
  color: string;
}

@Component({
  selector: 'app-game-lr',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
  ],
  templateUrl: './game-lr.html',
  styleUrl: './game-lr.scss',
})
export class GameLr {
  isRunning: boolean = false;
  langs: SelectOptionType[] = [
    { id: "es-ES", label: "Español" },
    { id: "en-US", label: "English" },
    { id: "fr-FR", label: "Français" },
  ];
  currentLang: string = "es-ES";
  words: WordType[] = [];

  currentColor: number = 0;
  colors = generateHueColors(5, 70, 70);

  constructor(
    public voiceSrv: VoiceRecognitionService,
    public speechSrv: SpeechSynthesisService,
    public cdr: ChangeDetectorRef,
  ) {
    this.voiceSrv.setInterimResults(true);
    this.voiceSrv.setContinuous(false);

    const word$ = this.voiceSrv.recognizedWord$.pipe(
      filter(w => w.confidence >= 0.5),
      map(w => ({ ...w, word: w.word.toLowerCase().trim() })),
      distinctUntilChanged((prev, curr) => {
        const sameWord = prev.word === curr.word;
        const shortDiffTime = Math.abs(prev.timestamp - curr.timestamp) < 600;
        return sameWord && shortDiffTime;
      }),
    );

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

  getNextColor() {
    const actual = this.colors[this.currentColor];
    this.currentColor++;
    if (this.currentColor >= this.colors.length) {
      this.currentColor = 0;
    }
    return actual;
  }

  async ngOnInit() {
    await this.speechSrv.init();
  }

  defineLanguage(val: string) {
    this.currentLang = val;
  }

  startListening() {
    this.voiceSrv.start({ lang: this.currentLang, autorestart: true });
    this.words = [];
    this.isRunning = true;
  }

  stopListening() {
    this.voiceSrv.setAutorestart(false);
    this.voiceSrv.stop();
    this.isRunning = false;
  }

  async talk() {
    const langs = this.speechSrv.getLangs();
    console.log(langs);
    this.speechSrv.speak("Hello from Angular!");
  }
}
