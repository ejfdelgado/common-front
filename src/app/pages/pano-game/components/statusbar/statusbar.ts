import { Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-statusbar',
  imports: [
    CommonModule
  ],
  templateUrl: './statusbar.html',
  styleUrl: './statusbar.scss',
})
export class Statusbar implements OnChanges {
  @ViewChild('progress_reference') progresReference!: ElementRef;
  @Input() progress?: number;
  @Input() isListening: boolean = false;

  ngOnChanges(changes: SimpleChanges) {
    this.updateProgressBarWidth();
  }

  updateProgressBarWidth() {
    if (!this.progresReference) {
      return;
    }
    let value: number = 0;
    if (this.isListening) {
      if (typeof this.progress == "number") {
        value = this.progress;
      }
    }
    this.progresReference.nativeElement.style.width = value + "%";
  }
}
