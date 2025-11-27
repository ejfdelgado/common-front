import { VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { IndicatorService, Wait } from "@services/indicator.service";
import { generateHueColors } from '@tools/Colors';

export const POSSIBLE_LANGS = ["es-ES", "en-US", "fr-FR"];

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
}