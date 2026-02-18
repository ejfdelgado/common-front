import { Injectable } from "@angular/core";
import { ParamsService } from "./params.service";
import { GenerateContentResponse, GoogleGenAI, type GenerateContentConfig } from "@google/genai";

@Injectable({
    providedIn: 'root',
})
export class ChatGeminiService {

    GEMINI_API_KEY: string = "";
    GEMINI_MODEL: string = "";
    private client_: GoogleGenAI | null = null;

    constructor(
        private paramsSrv: ParamsService,
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
        this.getClient();
    }

    async generateContent(history: any[], config: GenerateContentConfig): Promise<GenerateContentResponse> {
        const client = this.getClient();
        const response = await client.models.generateContent({
            model: this.GEMINI_MODEL,
            contents: history,
            config: config
        });
        return response;
    }
}