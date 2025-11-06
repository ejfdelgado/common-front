import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SpeechSynthesisService {
    private voices: SpeechSynthesisVoice[] = [];

    async init(): Promise<void> {
        this.voices = await this.loadVoices();
    }

    private loadVoices(): Promise<SpeechSynthesisVoice[]> {
        return new Promise((resolve) => {
            const voices = speechSynthesis.getVoices();
            if (voices.length) return resolve(voices);
            speechSynthesis.addEventListener('voiceschanged', () => {
                resolve(speechSynthesis.getVoices());
            });
        });
    }

    speak(text: string, lang: string = 'en-US'): void {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.voices.find(v => v.lang === lang) || null;
        speechSynthesis.speak(utterance);
    }

    getLangs() {
        return this.voices.map(el => el.lang);
    }
}
