import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '../services/translate.service';

@Pipe({
  name: 'translate',
})
export class TranslatePipe implements PipeTransform {
  constructor(private translateSrv: TranslateService) { }
  transform(value: string, ...args: unknown[]): Promise<unknown> {
    if (args[1]) {
      return new Promise(async (resolve, reject) => {
        try {
          let rendered = await this.translateSrv.translate(value, args);
          resolve(rendered);
        } catch (err) {
          reject(err);
        }
      });
    } else {
      return this.translateSrv.translate(value, args);
    }
  }
}
