import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, map } from 'rxjs';
import { environment } from 'environments/environment';
import { ApiResponse } from 'types/file';
import { IndicatorService } from './indicator.service';
import { decode } from '@msgpack/msgpack';
import { JSEncrypt } from "jsencrypt";
import * as CryptoJS from 'crypto-js';

@Injectable({
    providedIn: 'root',
})
export class ParamsService {

    static publicKey: string | null = null;
    static tempPass: string = ParamsService.generateKey();

    constructor(
        private http: HttpClient,
        private indicatorSrv: IndicatorService,
    ) { }

    static generateKey(keyLength = 20) {
        // define the characters to pick from
        const chars =
            "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz*&-%/!?*+=()";
        let randomstring = "";
        for (let i = 0; i < keyLength; i++) {
            const rnum = Math.floor(Math.random() * chars.length);
            randomstring += chars.substring(rnum, rnum + 1);
        }
        return randomstring;
    };

    async getPublicKey(): Promise<string> {
        if (ParamsService.publicKey == null) {
            const response = await firstValueFrom(
                this.http.get<ApiResponse>(`${environment.apiUrl}params/public_key`));
            ParamsService.publicKey = response.data;
            return response.data;
        }
        return ParamsService.publicKey;
    }

    async getEncriptedKey() {
        let publicKey = await this.getPublicKey();
        publicKey = publicKey.replace('\n', '');
        const rsaEncrypt = new JSEncrypt();
        rsaEncrypt.setPublicKey(publicKey);
        const encryptedKey = rsaEncrypt.encrypt(ParamsService.tempPass);
        return encryptedKey;
    }

    decryptAES(encryptedText: string, passphrase: string): string {
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedText, passphrase);
            const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

            if (!decryptedText) {
                throw new Error('Invalid passphrase or corrupted data');
            }

            return decryptedText;
        } catch (error) {
            console.error('Decryption failed:', error);
            throw error;
        }
    }

    async read(
    ): Promise<any> {
        const indicator = this.indicatorSrv.start();
        try {
            const encriptedKey = await this.getEncriptedKey();
            const response = await firstValueFrom(
                this.http.post(`${environment.apiUrl}params/all`, {
                    pass: encriptedKey,
                }, { responseType: 'arraybuffer' })
                    .pipe(
                        map((buffer: any) => {
                            const rawData: any = decode(new Uint8Array(buffer));
                            const decripted = this.decryptAES(rawData, (ParamsService.tempPass + "a").split('').reverse().join(''));
                            return JSON.parse(decripted);
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
