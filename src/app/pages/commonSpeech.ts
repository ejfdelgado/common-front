import { CommandConfigType, RecognizedWord, VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { IndicatorService, Wait } from "@services/indicator.service";
import { generateHueColors } from '@tools/Colors';
import { debounceTime } from 'rxjs/operators';
import { Subscription } from "rxjs";
import { BooleanStateService } from "@services/boolean-state.service";

export const POSSIBLE_LANGS = ["es-ES", "en-US", "fr-FR"];

export interface VoiceAnswer {
    text: string;
    index: number;
}

export interface VoiceQuery {
    reg: RegExp,
    index: number;
};

export interface SelectOptionType {
    id: string;
    label: string;
    icon: string;
};

export interface WordType {
    word: string;
    time: number;
    color: string;
}

export class CommonSpeech {
    tParam: string = "0";
    langs: SelectOptionType[] = [
        { id: "es-ES", label: "Español", icon: "🇪🇸" },
        { id: "en-US", label: "English", icon: "🇺🇸" },
        { id: "fr-FR", label: "Français", icon: "🇫🇷" },
    ];
    currentLang: string = "es-ES";
    currentColor: number = 0;
    colors = generateHueColors(10, 70, 70);
    isRunning: boolean = false;
    words: WordType[] = [];
    constructor(
        public voiceSrv: VoiceRecognitionService,
        public speechSrv: SpeechSynthesisService,
        public indicatorSrv: IndicatorService,
        public booleanService: BooleanStateService,
        preferedLang?: string,
    ) {
        if (preferedLang) {
            this.currentLang = preferedLang;
        }
        const params = this.getUrlQueryParams();
        const suggestedLang = params.get("lan");
        const tParam = params.get("t");
        if (tParam) {
            this.tParam = tParam;
        }
        if (suggestedLang && POSSIBLE_LANGS.indexOf(suggestedLang) >= 0) {
            this.currentLang = suggestedLang;
        }
        this.speechSrv.init();
    }
    getUrlQueryParams() {
        return new URLSearchParams(window.location.hash.split("?")[1]);
    }

    removeEmojis(text: string) {
        return text.replace(/\p{Emoji}/gu, '');
    }

    async talk(text: string, useLoading: boolean = false) {
        let promise: any = null;
        if (useLoading) {
            promise = this.indicatorSrv.start();
        }
        const sanitized = this.removeEmojis(text);
        await this.speechSrv.speak(sanitized, this.currentLang);
        if (promise) {
            promise.done();
        }
    }

    defineLanguage(val: SelectOptionType | string) {
        if (typeof val == "string") {
            this.currentLang = val;
        } else {
            this.currentLang = val.id;
            this.talk(val.label);
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

    async fetchJson<T>(url: string): Promise<T> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        const data: T = await response.json();
        return data;
    }

    async loadConfiguration(url: string): Promise<any> {
        const promise: Wait = this.indicatorSrv.start();
        const configUrl = `${url}?t=${this.tParam}`;
        try {
            return await this.fetchJson(configUrl);
        } catch (err) {
            // ToDo Display error
        } finally {
            promise.done();
        }
        return null;
    }

    async genericVoiceQuery(query1: string[], options: VoiceQuery[], timeout: number | null = 5000, repeat: boolean = true): Promise<VoiceAnswer> {
        this.stopListening();
        const query = [...query1];
        const picked = query.splice(Math.floor(Math.random() * query.length), 1);
        await this.talk(picked[0]);
        const config: CommandConfigType = {
            confidenceMin: 0.5,
            maxDiffMillis: 600,
            commands: {},
        };
        this.voiceSrv.setInterimResults(false);
        this.voiceSrv.setContinuous(false);
        this.startListening();
        const { word$, command$ } = this.voiceSrv.singleWordConnect(config);
        let subscription: Subscription | null = null;
        let timeoutHandler: NodeJS.Timeout | null = null;
        // Intermediate updates
        let refreshInterval: NodeJS.Timeout | null = null;
        if (typeof timeout == "number") {
            const steps = 10;
            const stepMillis = timeout / steps;
            const startTime = Date.now();
            this.booleanService.setState({ inUse: true, percentage: 100, });
            refreshInterval = setInterval(() => {
                const actual = Date.now();
                const diff = actual - startTime;
                const advance = 100 * Math.max(1 - diff / timeout, 0);
                this.booleanService.setState({ inUse: true, percentage: advance, });
            }, stepMillis);
        }
        const promise = new Promise<VoiceAnswer>((resolve, reject) => {
            if (typeof timeout == "number") {
                timeoutHandler = setTimeout(() => {
                    reject();
                }, timeout);
            }
            const addWordFun = (input: RecognizedWord) => {
                if (input.transcript) {
                    let index = 0;
                    for (let opcion of options) {
                        const normalized = this.voiceSrv.normalizeString(input.transcript);
                        const groups = opcion.reg.exec(normalized);
                        if (groups) {
                            const name = groups[opcion.index];
                            //console.log(index);
                            //console.log(input);
                            //console.log(groups);
                            //console.log(name);
                            resolve({
                                index,
                                text: name,
                            });
                            break;
                        }
                        index++;
                    }
                }
            };
            subscription = word$.pipe(
                debounceTime(300)
            ).subscribe(addWordFun);
        });
        promise.finally(() => {
            if (timeoutHandler) {
                clearTimeout(timeoutHandler);
            }
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
            this.stopListening();
            if (subscription) {
                subscription.unsubscribe();
            }
        });
        if (repeat) {
            return new Promise((resolve) => {
                promise.then((success) => {
                    resolve(success);
                }).catch(() => {
                    requestAnimationFrame(async () => {
                        const response = await this.genericVoiceQuery(query1, options, timeout, repeat);
                        resolve(response);
                    });
                });
            });
        } else {
            return promise;
        }
    }

    async askName() {
        this.stopListening();
        await this.talk("Hola, espero estés muy bien");
        let nombre: VoiceAnswer = {
            index: 0,
            text: "",
        };

        do {

            nombre = await this.genericVoiceQuery([
                "por favor dime cuál es tu nombre?",
                "por favor dime cómo te llamas?",
                "por favor dime cómo te puedo llamar?",
            ], [
                { reg: /(yo\s)(me\s)(llamo\s)(.+)$/ig, index: 4 },
                { reg: /(me\s)(llamo\s)(.+)$/ig, index: 3 },
                { reg: /(llamame\s|llameme\s)(.+)$/ig, index: 2 },
                { reg: /(me\s)(puedes?\s)(llamar\s)(.+)$/ig, index: 4 },
                { reg: /(mi\s)(nombre\s)(es\s)(.+)$/ig, index: 4 },
                { reg: /(.+)/ig, index: 1 },
            ]);

            const confirmacion = await this.genericVoiceQuery([
                `Confírmame si te puedo llamar ${nombre.text}?`,
                `Escuché bien que tu nombre es ${nombre.text}?`,
                `Está bien si te llamo ${nombre.text}?`,
            ], [
                { reg: /(no|incorrecto|mal)/ig, index: 1 },
                { reg: /(si|correcto|bien|confirmado)/ig, index: 1 },
            ]);
            if (confirmacion.index == 1) {
                //confirmed
                await this.talk(`Listo ${nombre.text}! vamos a jugar`);
                break;
            }
        } while (true);
        return nombre.text;
    }
}