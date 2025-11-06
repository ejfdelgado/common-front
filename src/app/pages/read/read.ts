import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { VoiceRecognitionService } from "@services/voicerecognition.service";
import { SpeechSynthesisService } from "@services/speechsynthesis.service";
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-read',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
  ],
  templateUrl: './read.html',
  styleUrl: './read.scss',
})
export class Read {
  constructor(
    public voiceSrv: VoiceRecognitionService,
    public speechSrv: SpeechSynthesisService,
  ) {
    this.voiceSrv.setInterimResults(true);
    this.voiceSrv.setContinuous(false);

    const word$ = this.voiceSrv.recognizedWord$.pipe(
      filter(w => w.confidence >= 0.9),
      map(w => ({ ...w, word: w.word.toLowerCase().trim() })),
      distinctUntilChanged((prev, curr) => {
        const sameWord = prev.word === curr.word;
        const shortDiffTime = Math.abs(prev.timestamp - curr.timestamp) < 600;
        return sameWord && shortDiffTime;
      }),
    );

    word$.subscribe((data) => {
      console.log(data);
    });
  }

  async ngOnInit() {
    await this.speechSrv.init();
  }

  async startListening() {
    //this.voiceSrv.start("en-US");
    this.voiceSrv.start({ lang: "es-ES", autorestart: true });
    //this.voiceSrv.start("fr-FR");
  }

  async talk() {
    const langs = this.speechSrv.getLangs();
    console.log(langs);
    this.speechSrv.speak("Hello from Angular!");
  }
}
