import { Injectable } from "@angular/core";
import { ParamsService } from "./params.service";
import { GenerateContentResponse, type GenerateContentConfig } from "@google/genai";
import { firstValueFrom, map } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { environment } from "environments/environment";
import { ApiResponse } from "types/file";
import { encode } from "@msgpack/msgpack";
import { FoundKnowledge, QueryChatType, ToolDataType, ToolResponseType, AssistantStateType } from "types/ragTypes";
import { Buffer } from 'buffer';

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
        await this.paramsSrv.getPublicKey();
    }

    async generateContent(
        history: any[],
        extra: QueryChatType,
        config: GenerateContentConfig,
        author: string,
        tools: ToolDataType[],
        state: AssistantStateType,
        useFacts?: boolean,
    ): Promise<{
        result: GenerateContentResponse[],
        toolsStatus: ToolResponseType[],
        searchedResult: FoundKnowledge[],
    }> {
        const payload = {
            history,
            config,
            author,
            tools,
            extra,
            state,
            useFacts,
            pass: await this.paramsSrv.getEncriptedKey(ChatGeminiService.tempPass),
        };
        const encoded: Uint8Array = encode(JSON.stringify(payload));
        const buffer = Buffer.from(encoded.buffer, encoded.byteOffset, encoded.byteLength);
        const response: ApiResponse = await firstValueFrom(
            this.http.post(environment.apiUrl + "gemini/query",
                buffer,
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