import { ChangeDetectorRef } from '@angular/core';
import { SelectOptionAny } from 'src/types/fieldsTypes';
import { TranslateService } from '../services/translate.service';

export async function translateSelectOptions(
  translateFolder: string,
  options: SelectOptionAny[],
  cdr: ChangeDetectorRef,
  translateSrv: TranslateService,
  prefix: string = '',
) {
  const promises: Promise<string>[] = [];
  options.forEach(async (option) => {
    const pending = translateSrv.translate(`${prefix}${option.label_key}`, [translateFolder]);
    promises.push(pending);
  });
  const responses = await Promise.all(promises);
  options.forEach(async (option, index) => {
    option.label = responses[index];
  });
  cdr.detectChanges();
}
