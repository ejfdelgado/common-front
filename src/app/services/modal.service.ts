import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfigService } from './config.service';
import { GenericComponent, GenericData } from 'app/modals/generic/generic.component';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  TRANSLATION: any = {
    'en': {
      "yes": "Yes",
      "no": "No",
      "ok": "Ok",
      "ups": "Oops!",
    },
    'es': {
      "yes": "Sí",
      "no": "No",
      "ok": "Ok",
      "ups": "Ups!",
    },
  }
  constructor(
    public dialog: MatDialog,
    private configService: ConfigService,
  ) { }

  translate(key: string) {
    let lang = this.configService.getCurrentLanguage();
    if (!(lang in this.TRANSLATION)) {
      lang = 'es';
    }
    return this.TRANSLATION[lang][key];
  }

  async generic(payload: GenericData) {
    const dialogRef = this.dialog.open(GenericComponent, {
      data: payload,
      disableClose: true, //Force pick a choice
    });
    return new Promise((resolve) => {
      dialogRef.afterClosed().subscribe((result) => {
        resolve(result);
      });
    });
  }

  genericComplete(payload: GenericData) {
    const dialogRef = this.dialog.open(GenericComponent, {
      data: payload,
      disableClose: true, //Force pick a choice
    });
    return {
      ref: dialogRef,
      promise: new Promise((resolve) => {
        dialogRef.afterClosed().subscribe((result) => {
          resolve(result);
        });
      }),
    };
  }
}
