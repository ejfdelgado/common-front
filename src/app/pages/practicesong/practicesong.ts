import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CommandConfigType, RecognizedWord, VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { IndicatorService, Wait } from '@services/indicator.service';
import { CommonSpeech, SelectOptionType } from "../commonSpeech";
import { ModuloSonido } from '@services/sonido.service';
import { BooleanStateService } from "@services/boolean-state.service";
import { ClipboardUtil } from "@tools/Clipboard";

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
  isCopying: boolean = false;
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
      //this.config = await this.loadConfiguration(`${ROOT_PATH}${q}`);
      this.config = {
        "lang": "en-US",
        "sound": "runaway.mp3",
        "lyric": [
          { "txt": "🎵", "millis": 1 },
          { "txt": "I was listenin' 🙉 to the ocean 🌊", "millis": 17401 },
          { "txt": "I saw 👀 a face 😊 in the sand ⛱️", "millis": 21002 },
          { "txt": "But when I picked it up 🫳", "millis": 24603 },
          { "txt": "Then it vanished away from my hands 🤲, da-da", "millis": 26704 },
          { "txt": "I had a dream 💭 I was seven 7️⃣", "millis": 33904 },
          { "txt": "Climbing 🧗‍♀️ my way in a tree 🌳", "millis": 37505 },
          { "txt": "I saw 👀 a piece of heaven 🌅", "millis": 41106 },
          { "txt": "Waiting impatient for me, da-da", "millis": 44106 },
          { "txt": "And I was running far away", "millis": 50406 },
          { "txt": "Would I run off the world someday?", "millis": 52207 },
          { "txt": "Nobody knows, nobody knows", "millis": 54906 },
          { "txt": "I was dancing in the rain", "millis": 58508 },
          { "txt": "I felt alive and I can't complain", "millis": 60908 },
          { "txt": "But now take me home", "millis": 63308 },
          { "txt": "Take me home where I belong", "millis": 65108 },
          { "txt": "I can't take it anymore", "millis": 69308 },
          { "txt": "I was painting a picture", "millis": 75909 },
          { "txt": "The picture was a painting of you", "millis": 78609 },
          { "txt": "And for a moment I thought you were here", "millis": 82208 },
          { "txt": "But then again, it wasn't true, da-da", "millis": 86108 },
          { "txt": "And all this time I have been lying", "millis": 92108 },
          { "txt": "Oh, lying in secret to myself", "millis": 95408 },
          { "txt": "I've been putting sorrow on the farthest place on my shelf", "millis": 99609 },
          { "txt": "La-di-da", "millis": 105309 },
          { "txt": "And I was running far away", "millis": 108610 },
          { "txt": "Would I run off the world someday?", "millis": 110710 },
          { "txt": "Nobody knows, nobody knows", "millis": 113410 },
          { "txt": "I was dancing in the rain", "millis": 117010 },
          { "txt": "I felt alive and I can't complain", "millis": 119410 },
          { "txt": "But now take me home", "millis": 121810 },
          { "txt": "Take me home where I belong", "millis": 123912 },
          { "txt": "I got no other place to go", "millis": 127210 },
          { "txt": "Now take me home", "millis": 130210 },
          { "txt": "Take me home where I belong", "millis": 132311 },
          { "txt": "I got no other place to go", "millis": 135311 },
          { "txt": "Now take me home", "millis": 138812 },
          { "txt": "Take me home where I belong", "millis": 140612 },
          { "txt": "I can't take it anymore", "millis": 144212 },
          { "txt": "But I kept running for a soft place to fall", "millis": 149613 },
          { "txt": "And I kept running for a soft place to fall", "millis": 158013 },
          { "txt": "But I kept running for a soft place to fall", "millis": 166412 },
          { "txt": "And I kept running for a soft place to fall", "millis": 174813 },
          { "txt": "And I was running far away", "millis": 183813 },
          { "txt": "Would I run off the world someday?", "millis": 185913 },
          { "txt": "But now take me home", "millis": 188814 },
          { "txt": "Take me home where I belong", "millis": 190713 },
          { "txt": "I got no other place to go", "millis": 194214 },
          { "txt": "Now take me home", "millis": 197214 },
          { "txt": "Take me home where I belong", "millis": 199014 },
          { "txt": "I got no other place to go", "millis": 202314 },
          { "txt": "Now take me home", "millis": 205315 },
          { "txt": "Home where I belong", "millis": 208016 },
          { "txt": "No, no", "millis": 210716 },
          { "txt": "Now take me home", "millis": 213416 },
          { "txt": "Home where I belong", "millis": 216416 },
          { "txt": "Home, home", "millis": 219116 },
          { "txt": "Now take me home", "millis": 222116 },
          { "txt": "Home where I belong", "millis": 224517 },
          { "txt": "No, no", "millis": 227818 },
          { "txt": "Now take me home", "millis": 230219 },
          { "txt": "Home where I belong", "millis": 233216 },
          { "txt": "I can't take it anymore", "millis": 236517 }
        ]
      };
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

  copyMillis() {
    this.isCopying = true;
    setTimeout(() => {
      this.isCopying = false;
      this.cdr.detectChanges();
    }, 1000);
    ClipboardUtil.writeText(`${this.millisTime}`);
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
    const offset = childRect.top - childRect.height - parentRect.top + parentEl.scrollTop;

    parentEl.scrollTo({
      top: offset,
      behavior: 'smooth'
    });
  }
}