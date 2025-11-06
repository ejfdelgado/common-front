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

    speak(text: string, lang: string = 'en-US'): Promise<boolean> {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.voices.find(v => v.lang === lang) || null;
        return new Promise((resolve, reject) => {
            utterance.onend = () => {
                resolve(true);
            }
            utterance.onerror = (e) => {
                resolve(false);
            }
            speechSynthesis.speak(utterance);
        });
    }

    getLangs() {
        return this.voices.map(el => el.lang);
    }
}
