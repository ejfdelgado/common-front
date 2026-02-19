import { Injectable } from "@angular/core";
import { ParamsService } from "./params.service";
import { GenerateContentResponse, GoogleGenAI, type GenerateContentConfig } from "@google/genai";
import { firstValueFrom } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { environment } from "environments/environment";
import { ApiResponse } from "types/file";

@Injectable({
    providedIn: 'root',
})
export class ChatGeminiService {

    GEMINI_API_KEY: string = "";
    GEMINI_MODEL: string = "";
    GEMINI_PASS: string = "";

    private client_: GoogleGenAI | null = null;

    constructor(
        private paramsSrv: ParamsService,
        private http: HttpClient,
    ) {

    }

    getClient(): GoogleGenAI {
        if (!this.client_) {
            this.client_ = new GoogleGenAI({ apiKey: this.GEMINI_API_KEY });
        }
        return this.client_;
    }

    async initialize() {
        const params = await this.paramsSrv.readOnce();
        this.GEMINI_API_KEY = params['GEMINI_API_KEY'];
        this.GEMINI_MODEL = params['GEMINI_MODEL'];
        this.GEMINI_PASS = params['GEMINI_PASS'];
        this.getClient();
    }

    async generateContentDirect(history: any[], config: GenerateContentConfig): Promise<GenerateContentResponse> {
        const client = this.getClient();
        const response = await client.models.generateContent({
            model: this.GEMINI_MODEL,
            contents: history,
            config: config
        });
        return response;
    }

    async generateContent(history: any[], config: GenerateContentConfig): Promise<GenerateContentResponse> {
        const payload = {
            history,
            config,
            pass: this.GEMINI_PASS,
        };
        const response = await firstValueFrom(
            this.http.post<ApiResponse>(environment.apiUrl + "gemini/query",
                payload, {
                headers: { '--noload': '1' }
            }));
        if (!response.success) {
            throw new Error(response.message);
        }
        return response.data;
    }
}