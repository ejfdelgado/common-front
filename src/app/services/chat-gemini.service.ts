import { Injectable } from "@angular/core";
import { ParamsService } from "./params.service";
import { GenerateContentResponse, GoogleGenAI, type GenerateContentConfig } from "@google/genai";
import { firstValueFrom, map } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { environment } from "environments/environment";
import { ApiResponse } from "types/file";
import { ToolDataType } from "types/ragTypes";

@Injectable({
    providedIn: 'root',
})
export class ChatGeminiService {

    static tempPass: string = ParamsService.generateKey();

    constructor(
        private paramsSrv: ParamsService,
        private http: HttpClient,
    ) {
    }

    async initialize() {
        this.paramsSrv.getPublicKey();
    }

    async generateContent(
        history: any[],
        config: GenerateContentConfig,
        author: string,
        tools: ToolDataType[]
    ): Promise<GenerateContentResponse> {
        const payload = {
            history,
            config,
            author,
            tools,
            pass: await this.paramsSrv.getEncriptedKey(ChatGeminiService.tempPass),
        };
        const response: ApiResponse = await firstValueFrom(
            this.http.post(environment.apiUrl + "gemini/query",
                payload,
                {
                    responseType: 'text',
                    headers: { '--noload': '1' },
                }
            ).pipe(
                map((rawData: any) => {
                    const decripted = ParamsService.decryptAES(rawData, (ChatGeminiService.tempPass + "a").split('').reverse().join(''));
                    return JSON.parse(decripted);
                })
            ));
        if (!response.success) {
            throw new Error(response.message);
        }
        return response.data;
    }
}