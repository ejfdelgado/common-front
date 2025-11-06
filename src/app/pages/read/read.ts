import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { VoiceRecognitionService } from "@services/voicerecognition.service";

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
    public voiceSrv: VoiceRecognitionService
  ) {
    this.voiceSrv.setInterimResults(true);
    this.voiceSrv.recognizedWord$.subscribe((data) => {
      console.log(JSON.stringify(data));
    });
  }

  async startListening() {
    //this.voiceSrv.start("en-US");
    this.voiceSrv.start("es-MX");
  }
}
