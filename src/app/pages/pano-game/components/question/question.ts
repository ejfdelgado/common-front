import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface OptionDataType {
  text: string;
  id: string;
  selected?: boolean;
}

export interface QuestionDataType {
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
export class Question {

  @Input() question!: QuestionDataType;

  cache: { [key: string]: SafeHtml } = {};

  constructor(
    private sanitizer: DomSanitizer
  ) {

  }

  sanitizeText(text: string) {
    if (text in this.cache) {
      return this.cache[text];
    } else {
      this.cache[text] = this.sanitizer.bypassSecurityTrustHtml(text);
      return this.cache[text];
    }
  }
}
