import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CommandConfigType, RecognizedWord, VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { distinctUntilChanged, filter, map } from 'rxjs';
import { IndicatorService, Wait } from '@services/indicator.service';
import { CommonSpeech, SelectOptionType } from "../commonSpeech";
import { ModuloSonido } from '@services/sonido.service';

const ROOT_PATH = "https://storage.googleapis.com/pro-ejflab-assets/songs/";

export interface Verse {
  txt: string;
  selected?: boolean;
  millis?: number;
}

export interface ConfigSong {
  lang: string;
  lyric: Verse[];
  sound: string;
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

  config: ConfigSong | null = null;

  @ViewChild('parentContainer', { read: ElementRef })
  parent!: ElementRef<HTMLElement>;

  @ViewChildren('child', { read: ElementRef })
  children!: QueryList<ElementRef<HTMLElement>>;

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
    // Load json
    const params = this.getUrlQueryParams();
    const q = params.get("q");
    if (q !== null) {
      // Fetch from bucket json
      this.config = await this.loadConfiguration(`${ROOT_PATH}${q}`);
      if (this.config) {
        this.defineLanguage(this.config.lang);
        this.cdr.detectChanges();
      }
    }
  }

  async playVerse1(event: MouseEvent, verse: Verse) {
    event.stopPropagation();
    this.stopSong();
    if (verse.millis !== undefined) {
      this.millisTime = verse.millis + 1;
    }
    this.computeCurrentVerse();
    this.cdr.detectChanges();
    await this.talk(verse.txt);
  }

  async playVerse2(event: MouseEvent, verse: Verse) {
    event.stopPropagation();
    if (typeof verse.millis == "number") {
      this.startSong(verse.millis);
    }
  }

  async startSong(startingPoint: number) {
    if (!this.config) {
      return;
    }
    const promise = this.indicatorSrv.start();
    await ModuloSonido.play(ROOT_PATH + this.config.sound, false, 1, startingPoint);
    promise.done();
    this.isPlaying = true;
    this.cdr.detectChanges();
    this.millisStartTime = Date.now() - startingPoint;
    this.resetInterval();
    this.cronoInterval = setInterval(() => {
      this.millisTime = Date.now() - this.millisStartTime;
      this.computeCurrentVerse();
      this.cdr.detectChanges();
    }, 300);
  }

  async stopSong() {
    if (!this.config) {
      return;
    }
    ModuloSonido.stop(ROOT_PATH + this.config.sound);
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
    if (!this.config) {
      return;
    }
    const song = this.config.lyric;
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
      const index = song.indexOf(last);
      this.scrollToIndex(index);
    }
  }

  toggleSong() {
    if (this.isPlaying) {
      this.stopSong();
    } else {
      this.startSong(this.millisTime);
    }
  }

  scrollToIndex(index: number) {
    const parentEl = this.parent.nativeElement;
    const childEl = this.children.get(index)?.nativeElement;

    if (!childEl) return;

    const parentRect = parentEl.getBoundingClientRect();
    const childRect = childEl.getBoundingClientRect();

    const fullyVisible =
      childRect.top >= parentRect.top &&
      childRect.bottom + childRect.height <= parentRect.bottom;

    if (fullyVisible) {
      return; // nothing to do
    }

    // Child is not fully visible → scroll to it
    const offset = childRect.top - parentRect.top + parentEl.scrollTop;

    parentEl.scrollTo({
      top: offset,
      behavior: 'smooth'
    });
  }
}