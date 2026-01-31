import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CommandConfigType, RecognizedWord, RecognizedWordId, VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { IndicatorService, Wait } from '@services/indicator.service';
import { CommonSpeech, SelectOptionType } from "../commonSpeech";
import { ModuloSonido } from '@services/sonido.service';
import { BooleanStateService } from "@services/boolean-state.service";
import { ClipboardUtil } from "@tools/Clipboard";
import { getUrlQueryParams } from '@tools/UrlUtil';
import { EditableInput } from '@components/fields/editable-input/editable-input';

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
    EditableInput,
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
  editing: boolean = true;

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
    // Load json
    const params = getUrlQueryParams();
    const q = params.get("q");
    if (q !== null) {
      // Fetch from bucket json
      //this.config = await this.loadConfiguration(`${ROOT_PATH}${q}`);

      this.config = {
        "lang": "en-US",
        "sound": "love_song_to_the_earth.mp3",
        "lyric": [
          {
            "txt": "🎵",
            "millis": 1,
            "selected": false
          },
          {
            "txt": "This is an open letter 💌 From you and me together 🧑‍🤝‍🧑",
            "millis": 16903,
            "selected": false
          },
          {
            "txt": "Tomorrow's in our hands 🙌 now",
            "millis": 20503,
            "selected": false
          },
          {
            "txt": "Find the words that matter say them out loud 👄",
            "millis": 24103,
            "selected": false
          },
          {
            "txt": "And make it better 💪 somehow, hmm-mm",
            "millis": 27103,
            "selected": false
          },
          {
            "txt": "Looking 🔍 down from up on the moon 🌙",
            "millis": 30703,
            "selected": false
          },
          {
            "txt": "It's a tiny blue 🔵 marble",
            "millis": 33703,
            "selected": false
          },
          {
            "txt": "Who'd have thought 💭 the ground 🌍 we stand on",
            "millis": 37303,
            "selected": false
          },
          {
            "txt": "Could be so fragile 🍷",
            "millis": 40903,
            "selected": false
          },
          {
            "txt": "This is a love ❤️ song 🎵 to the earth 🌏",
            "millis": 43303,
            "selected": false
          },
          {
            "txt": "You're no ordinary world 🌎",
            "millis": 46603,
            "selected": false
          },
          {
            "txt": "A diamond 💎 in the universe 🌌",
            "millis": 50503,
            "selected": false
          },
          {
            "txt": "Heaven's poetry 📖 to us",
            "millis": 53503,
            "selected": false
          },
          {
            "txt": "Keep 🔒 it safe, yeah, yeah",
            "millis": 57403,
            "selected": false
          },
          {
            "txt": "Keep 🔒 it safe, yeah, yeah",
            "millis": 61003,
            "selected": false
          },
          {
            "txt": "Keep 🔒 it safe, yeah, yeah",
            "millis": 64303,
            "selected": false
          },
          {
            "txt": "'Cause it's our world 🌏",
            "millis": 67903,
            "selected": false
          },
          {
            "txt": "It's our world 🌏",
            "millis": 70003,
            "selected": false
          },
          {
            "txt": "It's not about possessions, money 💰 or religion ✝️",
            "millis": 72103,
            "selected": false
          },
          {
            "txt": "How many years 🗓️ we might live",
            "millis": 75103,
            "selected": false
          },
          {
            "txt": "When the only real question 🤷‍♂️ that matters is still",
            "millis": 78103,
            "selected": false
          },
          {
            "txt": "A matter of perspective 🤔",
            "millis": 81703,
            "selected": false
          },
          {
            "txt": "Looking 🔎 down from up on the moon 🌙",
            "millis": 85304,
            "selected": false
          },
          {
            "txt": "You're a tiny blue 🔵 marble",
            "millis": 88604,
            "selected": false
          },
          {
            "txt": "Who'd have thought 💭 the ground 🌎 we stand on",
            "millis": 92803,
            "selected": false
          },
          {
            "txt": "Could be so fragile 🍷",
            "millis": 95803,
            "selected": false
          },
          {
            "txt": "This is a love ❤️ song 🎶 to the earth 🌏",
            "millis": 98204,
            "selected": false
          },
          {
            "txt": "You're no ordinary world 🌎",
            "millis": 101503,
            "selected": false
          },
          {
            "txt": "Diamond 💎 in the universe 🌌",
            "millis": 105403,
            "selected": false
          },
          {
            "txt": "Heaven's poetry 📖 to us",
            "millis": 108703,
            "selected": false
          },
          {
            "txt": "Keep 🔒 it safe, yeah, yeah",
            "millis": 112603,
            "selected": false
          },
          {
            "txt": "Keep 🔒 it safe, yeah, yeah",
            "millis": 115004,
            "selected": false
          },
          {
            "txt": "Keep 🔒 it safe (keep mama earth safe)",
            "millis": 118904,
            "selected": false
          },
          {
            "txt": "'Cause it's our world 🌎",
            "millis": 122204,
            "selected": false
          },
          {
            "txt": "It's our world 🌍",
            "millis": 124004,
            "selected": false
          },
          {
            "txt": "See mama earth 🌏 is in a crazy mess 🤮",
            "millis": 126104,
            "selected": false
          },
          {
            "txt": "It's time ⏰ for us to do our best 💪",
            "millis": 128204,
            "selected": false
          },
          {
            "txt": "From deep sea 🌊 straight up to Everest 🏔️",
            "millis": 130305,
            "selected": false
          },
          {
            "txt": "She's under crazy 😱 stress",
            "millis": 133605,
            "selected": false
          },
          {
            "txt": "Unless you wanna be motherless",
            "millis": 135105,
            "selected": false
          },
          {
            "txt": "Clean heart 🤍, green heart 💚 it's the way I stress",
            "millis": 136906,
            "selected": false
          },
          {
            "txt": "Speediness, and too much greediness",
            "millis": 140507,
            "selected": false
          },
          {
            "txt": "Six billion people 🧑‍🤝‍🧑 all want pettiness (it's our world)",
            "millis": 143507,
            "selected": false
          },
          {
            "txt": "Some people think 💭 this is harmless (it's our world)",
            "millis": 147407,
            "selected": false
          },
          {
            "txt": "But if we continue, there'll only be emptiness 🪹",
            "millis": 150408,
            "selected": false
          },
          {
            "txt": "Oh, no-no-no-no",
            "millis": 153708,
            "selected": false
          },
          {
            "txt": "This is a love ❤️ song to the earth",
            "millis": 156408,
            "selected": false
          },
          {
            "txt": "You're no ordinary world 🌎",
            "millis": 160009,
            "selected": true
          },
          {
            "txt": "A diamond 💎 in the universe 🌌",
            "millis": 163309,
            "selected": false
          },
          {
            "txt": "Heaven's poetry 📖 to us (heaven's poetry to us)",
            "millis": 166609,
            "selected": false
          },
          {
            "txt": "Keep 🔒 it safe, yeah, yeah (keep it safe)",
            "millis": 170510,
            "selected": false
          },
          {
            "txt": "Keep 🔒 it safe, yeah, yeah (keep it safe)",
            "millis": 173510,
            "selected": false
          },
          {
            "txt": "Keep 🔒 it safe, yeah, yeah (special paradise)",
            "millis": 176810,
            "selected": false
          },
          {
            "txt": "Let's keep 🔒 it safe",
            "millis": 181910,
            "selected": false
          },
          {
            "txt": "This is a love ♥️ song 🎼 to the earth 🌍",
            "millis": 184010,
            "selected": false
          },
          {
            "txt": "You're no ordinary world 🌏",
            "millis": 187611,
            "selected": false
          },
          {
            "txt": "Diamond 💎 in the universe 🌌",
            "millis": 190911,
            "selected": false
          },
          {
            "txt": "Heaven's poetry 📖 to us",
            "millis": 194511,
            "selected": false
          },
          {
            "txt": "Keep 🔒 it safe, yeah, yeah",
            "millis": 197811,
            "selected": false
          },
          {
            "txt": "Keep 🔒 it safe, yeah, yeah",
            "millis": 201411,
            "selected": false
          },
          {
            "txt": "Keep 🔒 it safe, yeah, yeah",
            "millis": 205011,
            "selected": false
          },
          {
            "txt": "It's our world 🌎 (keep it safe)",
            "millis": 208011,
            "selected": false
          },
          {
            "txt": "It's our world 🌎",
            "millis": 210412,
            "selected": false
          },
          {
            "txt": "It's our world 🌎",
            "millis": 214312,
            "selected": false
          },
          {
            "txt": "It's our world 🌎",
            "millis": 217912,
            "selected": false
          },
          {
            "txt": "'Cause it's our world 🌍",
            "millis": 221812,
            "selected": false
          }
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

  async playVerse2(event: MouseEvent, verse: Verse, stopIfPlaying: boolean = false) {
    event.stopPropagation();
    if (stopIfPlaying && this.isPlaying) {
      this.stopSong();
      return;
    }
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

  toggleSongFromBack() {
    if (this.editing == true) {
      return;
    }
    this.toggleSong();
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

  inputClick($event: any) {
    $event.preventDefault();
  }

  copyContent() {
    const temp = JSON.stringify(this.config?.lyric, null, 4);
    ClipboardUtil.writeText(temp);
  }

  pinMillis(verse: Verse) {
    verse.millis = this.millisTime;
  }
}