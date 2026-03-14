import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "environments/environment";
import { firstValueFrom } from "rxjs";
import { ApiResponse } from "types/file";
import { ArticleDataType, FactCursorDataType, KnowledgeDataType } from "types/ragTypes";
import { IndicatorService, Wait } from "./indicator.service";

@Injectable({
    providedIn: 'root',
})
export class AlterEgo2Service {
    constructor(
        private http: HttpClient,
        private indicatorSrv: IndicatorService,
    ) { }

    getIndexedText(fact: KnowledgeDataType) {
        let q = "";
        if (fact.type == "fact") {
            q = fact.txtFormat;
        } else {
            if (fact.answerFormat != undefined) {
                q = fact.answerFormat;
            }
        }
        return q;
    }

    async createUpdate(fact: KnowledgeDataType, parent: string) {
        const q = this.getIndexedText(fact);
        const payload = {
            id: fact.id,
            parent,
            q,
            metadata: fact,
        };
        const response = await firstValueFrom(this.http.post<ApiResponse>(environment.apiUrl + "supabase/crud",
            payload,
        ));
        if (response.success === true) {
            fact.id = response.data.id;
            if (response.data.created_at) {
                fact.created = response.data.created_at;
            }
        }
    }

    async delete(id: string, parent: string) {
        const payload = {
            id,
            parent,
        };
        const response = await firstValueFrom(this.http.post<ApiResponse>(environment.apiUrl + "supabase/crud",
            payload,
        ));
    }

    async pageFacts(parent: string, limit: number, cursor?: FactCursorDataType | null) {
        const payload = {
            cursor,
            parent,
            limit,
        };
        const response = await firstValueFrom(this.http.post<ApiResponse>(environment.apiUrl + "supabase/page",
            payload,
        ));
        const rows: KnowledgeDataType[] = (response.data.rows as any[]).map((row) => {
            const metadata = row.metadata as KnowledgeDataType;
            metadata.id = row.id;
            metadata.created = parseInt(row.created_at);
            return metadata;
        });
        const next = response.data.nextCursor;
        return {
            rows,
            next,
        };
    }

    async search(
        userInput: string,
        parent: string,
        top: number,
        distance: number,
        language: string,
        useIndicator: boolean,
    ) {
        let indicator: Wait | null = null;
        if (useIndicator) {
            indicator = this.indicatorSrv.start();
        }
        const payload = {
            q: userInput,
            parent,
            distance,
            n: top,
        };
        const response = await firstValueFrom(this.http.post<ApiResponse>(environment.apiUrl + "supabase/search",
            payload,
        ));
        //supabase/search
        if (indicator != null) {
            indicator.done();
        }
        return response;
    }

    async pageArticles(parent: string, limit: number, cursor?: FactCursorDataType | null) {
        const payload = {
            cursor,
            parent,
            limit,
        };
        const response = await firstValueFrom(this.http.post<ApiResponse>(environment.apiUrl + "articles/page",
            payload,
        ));
        const rows: ArticleDataType[] = (response.data.rows as any[]).map((row) => {
            // Complete metadata if needed
            const temp: ArticleDataType = {
                id: row.id,
                type: row.type,
                metadata: row.metadata,
                created: parseInt(row.created),
                keywords: row.keywords,
                updated: 0,
            };
            return temp;
        });
        const next = response.data.nextCursor;
        return {
            rows,
            next,
        };
    }

    async createUpdateArticles(fact: ArticleDataType, parent: string) {
        const payload = {
            id: fact.id,
            parent,
            q: fact.keywords,
            type: fact.type,
            metadata: JSON.parse(JSON.stringify(fact)),
        };
        delete payload.metadata.id;
        delete payload.metadata.keywords;
        delete payload.metadata.type;
        delete payload.metadata.created;
        delete payload.metadata.updated;
        const response = await firstValueFrom(this.http.post<ApiResponse>(environment.apiUrl + "articles/crud",
            payload,
        ));

        if (response.success === true) {
            fact.id = response.data.id;
            if (response.data.created_at) {
                fact.created = response.data.created_at;
            }
        }
    }

    async deleteArticles(id: string, parent: string) {
        const payload = {
            id,
            parent,
        };
        const response = await firstValueFrom(this.http.post<ApiResponse>(environment.apiUrl + "articles/crud",
            payload,
        ));
    }

    async searchArticles(q: string, parent: string): Promise<ArticleDataType[]> {
        const payload = {
            q,
            parent,
        };
        const response = await firstValueFrom(this.http.post<ApiResponse>(environment.apiUrl + "articles/search",
            payload,
        ));
        return response.data;
    }
}