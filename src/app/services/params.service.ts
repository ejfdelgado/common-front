import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, map } from 'rxjs';
import { environment } from 'environments/environment';
import { ApiResponse } from 'types/file';
import { IndicatorService } from './indicator.service';
import { decode } from '@msgpack/msgpack';
import { JSEncrypt } from "jsencrypt";
import * as CryptoJS from 'crypto-js';

export type ParameterDataType = { [key: string]: any };

@Injectable({
    providedIn: 'root',
})
export class ParamsService {

    static publicKey: string | null = null;
    static tempPass: string = ParamsService.generateKey();

    latestResponse: Promise<ParameterDataType> | null = null;

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

    async getEncriptedKey(pass: string) {
        let publicKey = await this.getPublicKey();
        publicKey = publicKey.replace('\n', '');
        const rsaEncrypt = new JSEncrypt();
        rsaEncrypt.setPublicKey(publicKey);
        const encryptedKey = rsaEncrypt.encrypt(pass);
        return encryptedKey;
    }

    static decryptAES(encryptedText: string, passphrase: string): string {
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

    async readOnce(): Promise<ParameterDataType> {
        if (this.latestResponse == null) {
            this.latestResponse = this.read();
        }
        return new Promise((resolve) => {
            if (this.latestResponse) {
                this.latestResponse.then(resolve).catch((err: any) => {
                    this.latestResponse = null;
                    setTimeout(async () => {
                        try {
                            const response = await this.readOnce();
                            resolve(response)
                        } catch (err2) { }

                    }, 1000);
                });
            }
        });
    }

    private async read(
    ): Promise<ParameterDataType> {
        const indicator = this.indicatorSrv.start();
        try {
            const encriptedKey = await this.getEncriptedKey(ParamsService.tempPass);
            const response = await firstValueFrom(
                this.http.post(`${environment.apiUrl}params/all`, {
                    pass: encriptedKey,
                }, { responseType: 'arraybuffer' })
                    .pipe(
                        map((buffer: any) => {
                            const rawData: any = decode(new Uint8Array(buffer));
                            const decripted = ParamsService.decryptAES(rawData, (ParamsService.tempPass + "a").split('').reverse().join(''));
                            return JSON.parse(decripted);
                        })
                    )
            );
            return response.data;
        } catch (err) {
            throw err;
        } finally {
            indicator.done();
        }
    }
}
