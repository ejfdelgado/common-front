import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "environments/environment";
import { firstValueFrom } from "rxjs";
import { ApiResponse } from "types/file";
import { FactCursorDataType, KnowledgeDataType } from "types/ragTypes";

@Injectable({
    providedIn: 'root',
})
export class AlterEgo2Service {
    constructor(
        private http: HttpClient,
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
        console.log(response);
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
        console.log(response);
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
}