import { VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { IndicatorService } from "@services/indicator.service";
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
    currentLang: string = "es-ES";
    currentColor: number = 0;
    colors = generateHueColors(10, 70, 70);
    isRunning: boolean = false;
    words: WordType[] = [];
    constructor(
        public voiceSrv: VoiceRecognitionService,
        public speechSrv: SpeechSynthesisService,
        public indicatorSrv: IndicatorService,
    ) {
        const params = this.getUrlQueryParams();
        const suggestedLang = params.get("lan");
        if (suggestedLang && POSSIBLE_LANGS.indexOf(suggestedLang) >= 0) {
            this.currentLang = suggestedLang;
        }
    }
    getUrlQueryParams() {
        return new URLSearchParams(window.location.hash.split("?")[1]);
    }

    async talk(text: string, useLoading: boolean = false) {
        let promise: any = null;
        if (useLoading) {
            promise = this.indicatorSrv.start();
        }
        await this.speechSrv.speak(text, this.currentLang);
        if (promise) {
            promise.done();
        }
    }

    defineLanguage(val: SelectOptionType) {
        this.currentLang = val.id;
        this.talk(val.label);
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
}