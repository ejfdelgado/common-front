import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface GenericChoiceData {
  txt: string;
  val: string;
  icon?: string;
  class?: string;
}

export interface GenericData {
  txt?: string;
  ishtml?: boolean;
  title?: string;
  timeout?: number;
  choices?: Array<GenericChoiceData>;
  callback?: string;
  translateFolder?: any
  model?: any;
  imageUrl?: string;
}

@Component({
  selector: 'app-generic',
  templateUrl: './generic.component.html',
  styleUrls: ['./generic.component.css'],
})
export class GenericComponent implements OnInit {
  text: string = 'Sin detalle';
  title: string = 'Pop Up';
  imageUrl?: string;
  timeout: number = 0; // means no timeout
  choices: Array<GenericChoiceData> = [];
  callback: string = '';
  translateFolder: string | null = null;
  model: any = null;
  constructor(
    public dialogRef: MatDialogRef<GenericComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GenericData
  ) {
    if (typeof data.txt == 'string') {
      this.text = data.txt;
    }
    if (typeof data.title == 'string') {
      this.title = data.title;
    }
    if (typeof data.timeout == 'number') {
      this.timeout = data.timeout;
    }
    if (data.choices instanceof Array) {
      this.choices = data.choices;
    }
    if (typeof data.callback == 'string') {
      this.callback = data.callback;
    }
    if (typeof data.translateFolder == 'string') {
      this.translateFolder = data.translateFolder;
    }
    if (typeof data.imageUrl == 'string') {
      this.imageUrl = data.imageUrl;
    }
    this.model = data.model;
  }

  ngOnInit(): void {
    // Si hay timeout, se configura
    if (this.timeout > 0) {
      setTimeout(() => {
        this.dialogRef.close({
          callback: this.callback,
          choice: '', //Empty choice...
        });
      }, this.timeout);
    }
  }

  selectChoice(choice: string) {
    this.dialogRef.close({
      callback: this.callback,
      choice,
    });
  }
}
