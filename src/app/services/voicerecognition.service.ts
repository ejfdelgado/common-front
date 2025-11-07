import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject, BehaviorSubject, filter, map, distinctUntilChanged } from 'rxjs';

export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English (United States)' },
  { code: 'en-GB', name: 'English (United Kingdom)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'es-MX', name: 'Spanish (Mexico)' },
  { code: 'fr-FR', name: 'French (France)' },
  { code: 'de-DE', name: 'German (Germany)' },
  { code: 'it-IT', name: 'Italian (Italy)' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'ru-RU', name: 'Russian (Russia)' },
  { code: 'ja-JP', name: 'Japanese (Japan)' },
  { code: 'ko-KR', name: 'Korean (Korea)' },
  { code: 'zh-CN', name: 'Chinese (Simplified, China)' },
  { code: 'zh-TW', name: 'Chinese (Traditional, Taiwan)' }
];

export interface CommandConfigType {
  confidenceMin: number,
  maxDiffMillis: number,
  commands: { [key: string]: { [key: string]: any } },
}

export interface StartOptions {
  lang?: string,
  autorestart?: boolean;
}

export interface RecognizedCommand {
  command: string;
  timestamp: number;
}

// Minimal type for emitted word events
export interface RecognizedWord {
  word: string;
  confidence: number;
  timestamp: number; // epoch ms
  transcript?: string; // full recognized transcript for the result
}

export type RecognitionStatus = 'idle' | 'listening' | 'error' | 'stopped' | 'unsupported';

// Cross-browser type for the Web Speech API
type SpeechRecognitionCtor = new () => SpeechRecognition;

@Injectable({ providedIn: 'root' })
export class VoiceRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isSupported = false;
  private autoRestart = false;

  // RxJS streams
  private wordSubject = new Subject<RecognizedWord>();
  readonly recognizedWord$ = this.wordSubject.asObservable();
  private word$: Observable<RecognizedWord> | null = null;
  private command$: Observable<RecognizedCommand> | null = null;

  private transcriptSubject = new Subject<string>();
  readonly transcript$ = this.transcriptSubject.asObservable();

  private statusSubject = new BehaviorSubject<RecognitionStatus>('idle');
  readonly status$ = this.statusSubject.asObservable();

  private errorSubject = new Subject<Error | string>();
  readonly error$ = this.errorSubject.asObservable();

  // optional keywords filter - if provided only these words will be emitted
  private keywords: string[] | null = null;

  constructor(private ngZone: NgZone) {
    this.setupRecognition();
  }

  private setupRecognition() {
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition || win.mozSpeechRecognition || win.msSpeechRecognition;

    if (!SpeechRecognition) {
      this.isSupported = false;
      this.statusSubject.next('unsupported');
      return;
    }

    try {
      this.recognition = new (SpeechRecognition as SpeechRecognitionCtor)();
      this.isSupported = true;

      // configuration defaults
      this.recognition.continuous = true; // keep listening
      this.recognition.interimResults = false; // emit only final results
      this.recognition.lang = 'en-US';

      // wire callbacks using ngZone to ensure Angular change detection runs
      this.recognition.onstart = () => this.runInZone(() => this.statusSubject.next('listening'));
      this.recognition.onend = () => this.runInZone(() => this.statusSubject.next('stopped'));
      this.recognition.onerror = (ev: any) => this.runInZone(() => this.handleError(ev));
      this.recognition.onresult = (ev: SpeechRecognitionEvent) => this.runInZone(() => this.handleResult(ev));
    } catch (err) {
      this.isSupported = false;
      this.statusSubject.next('unsupported');
      this.errorSubject.next(err as Error);
    }
  }

  private runInZone(fn: () => void) {
    this.ngZone.run(fn);
  }

  private handleError(ev: any) {
    // event structure varies by browser
    const message = ev?.error ? ev.error : ev?.message ? ev.message : JSON.stringify(ev);
    this.errorSubject.next(message);
    this.statusSubject.next('error');
  }

  private handleResult(ev: SpeechRecognitionEvent) {
    // results may contain multiple results; each result may have multiple alternatives
    const results = ev.results;
    let fullTranscript = '';

    for (let i = ev.resultIndex; i < results.length; i++) {
      const result = results[i];
      if (!result) continue;
      const best = result[0];
      if (!best) continue;
      const transcript = (best.transcript || '').trim();
      fullTranscript += (fullTranscript ? ' ' : '') + transcript;

      // split into words and emit per word
      const words = transcript.split(/\s+/).filter(w => w.length > 0);
      const timestamp = Date.now();

      words.forEach(w => {
        const normalized = w.replace(/[.,!?;:\/\"'()\[\]]+/g, '').toLowerCase();
        if (this.keywords && this.keywords.length > 0) {
          // emit only if word matches any keyword (case-insensitive)
          if (!this.keywords.map(k => k.toLowerCase()).includes(normalized)) return;
        }

        const payload: RecognizedWord = {
          word: normalized,
          confidence: best.confidence ?? 0,
          timestamp,
          transcript: fullTranscript,
        };

        this.wordSubject.next(payload);
      });
    }

    // also emit full transcript once per result callback
    if (fullTranscript) this.transcriptSubject.next(fullTranscript);
  }

  /** Public API */
  start(options: StartOptions) {
    if (!this.isSupported || !this.recognition) {
      this.statusSubject.next('unsupported');
      this.errorSubject.next('Speech Recognition API not supported in this browser');
      return;
    }

    if (typeof options.autorestart == 'boolean') {
      this.autoRestart = options.autorestart;
    }

    if (options.lang) this.recognition.lang = options.lang;

    try {
      this.recognition.start();

      if (options.autorestart === true) {
        this.recognition.onend = () => {
          if (this.isSupported && this.autoRestart) {
            this.start(options);
          }
        };
      }

      // status will be set by onstart
    } catch (err) {
      // Some browsers throw if start is called while already running
      this.errorSubject.next(err as Error);
    }
  }

  stop() {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
      // onend will set status
    } catch (err) {
      this.errorSubject.next(err as Error);
    }
  }

  setKeywords(keywords: string[] | null) {
    this.keywords = keywords && keywords.length > 0 ? keywords : null;
  }

  setContinuous(cont: boolean) {
    if (!this.recognition) return;
    this.recognition.continuous = cont;
  }

  setAutorestart(val: boolean) {
    this.autoRestart = val;
  }

  setInterimResults(enabled: boolean) {
    if (!this.recognition) return;
    this.recognition.interimResults = enabled;
  }

  setLanguage(lang: string) {
    if (!this.recognition) return;
    this.recognition.lang = lang;
  }

  isListening(): boolean {
    return this.statusSubject.value === 'listening';
  }

  supported(): boolean {
    return this.isSupported;
  }

  simplifyWord(word: string) {
    let result = word;
    result = result.toLowerCase().trim();
    return result;
  }

  normalizeString(input: string) {
    return input
      // Normalize accented characters into base + diacritic
      .normalize("NFD")
      // Remove diacritics (accents)
      .replace(/[\u0300-\u036f]/g, "")
      // Keep only letters (A–Z, a–z) and spaces
      .replace(/[^a-zA-Z\s]/g, "")
      // Replace multiple spaces with a single one and trim
      .replace(/\s+/g, " ")
      .trim();
  }

  singleWordConnect({
    confidenceMin,
    maxDiffMillis,
    commands
  }: CommandConfigType) {
    this.word$ = this.recognizedWord$.pipe(
      filter(w => w.confidence >= confidenceMin),
      map(w => ({ ...w, word: this.simplifyWord(w.word) })),
      distinctUntilChanged((prev, curr) => {
        const sameWord = prev.word === curr.word;
        const shortDiffTime = Math.abs(prev.timestamp - curr.timestamp) < maxDiffMillis;
        return sameWord && shortDiffTime;
      }),
    );
    this.command$ = this.word$.pipe(
      map((word) => {
        let dictionary: any = {};
        if (this.recognition?.lang && this.recognition.lang in commands) {
          dictionary = commands[this.recognition.lang];
        }
        let simplifiedWord = this.normalizeString(word.word);
        const comm: RecognizedCommand = {
          command: "",
          timestamp: word.timestamp,
        }
        if (simplifiedWord in dictionary) {
          comm.command = dictionary[simplifiedWord];
        }
        return comm;
      }),
      filter(w => w.command != "")
    );
    return {
      word$: this.word$,
      command$: this.command$,
    };
  }
}
