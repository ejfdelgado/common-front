import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonComponent } from '@components/common.component';
import { generateHueColors } from '@tools/Colors';

export interface OptionDataType {
  text: string;
  emoji: string;
  id: string;
  idRegex: string;
  selected?: boolean;
  points?: number;
}

export interface QuestionDataType {
  photo: string;
  sound: string;
  intro: string;
  text: string;
  options: OptionDataType[];
}

@Component({
  standalone: true,
  selector: 'app-question',
  imports: [
    CommonModule
  ],
  templateUrl: './question.html',
  styleUrl: './question.scss',
})
export class Question extends CommonComponent implements OnInit {

  @Input() question!: QuestionDataType;

  colors: string[] = [];

  constructor(
    public override sanitizer: DomSanitizer,
  ) {
    super(sanitizer);
  }

  ngOnInit() {
    this.colors = generateHueColors(this.question.options.length, 100, 70);
  }

  getBackgroundColor(i: number, selected?: boolean) {
    if (selected) {
      return this.colors[i] + (selected ? "FF" : "7F");
    } else {
      return "FFFFFF7F";
    }
  }
}
