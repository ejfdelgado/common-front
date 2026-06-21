import { Pipe, PipeTransform } from '@angular/core';
import moment from 'moment';
import 'moment/locale/es';

@Pipe({
    name: 'epochDate',
    standalone: true
})
export class EpochDatePipe implements PipeTransform {

    transform(
        epoch: number | null | undefined,
        format: string = 'DD/MM/YYYY'
    ): string {

        if (!epoch) return '';

        // Detect if epoch is in seconds (10 digits) and convert to milliseconds
        const isSeconds = epoch.toString().length === 10;
        const date = isSeconds ? epoch * 1000 : epoch;

        return moment(date).format(format);
    }
}
