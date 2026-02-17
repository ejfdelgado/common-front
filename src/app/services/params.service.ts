import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, map } from 'rxjs';
import { environment } from 'environments/environment';
import { ApiResponse } from 'types/file';
import { IndicatorService } from './indicator.service';
import { decode } from '@msgpack/msgpack';
import { Buffer } from "buffer";

@Injectable({
    providedIn: 'root',
})
export class ParamsService {
    constructor(
        private http: HttpClient,
        private indicatorSrv: IndicatorService,
    ) { }

    async read(
    ): Promise<any> {
        const indicator = this.indicatorSrv.start();
        try {
            const response = await firstValueFrom(
                this.http.get(`${environment.apiUrl}params/all`, { responseType: 'arraybuffer' })
                    .pipe(
                        map((buffer: any) => {
                            const base64Data: any = decode(new Uint8Array(buffer));
                            const decodedText = Buffer.from(base64Data, 'base64').toString('utf8');
                            return JSON.parse(decodedText);
                        })
                    )
            );
            return response;
        } catch (err) {
            throw err;
        } finally {
            indicator.done();
        }
    }
}
