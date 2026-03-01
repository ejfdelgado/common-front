import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "environments/environment";
import { firstValueFrom } from "rxjs";
import { ApiResponse } from "types/file";
import { FactCursorDataType, KnowledgeDataType } from "types/ragTypes";

@Injectable({
    providedIn: 'root',
})
export class AlterEgoService {
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
        const response = await firstValueFrom(this.http.post<ApiResponse>(environment.apiUrl + "/supabase/crud",
            payload,
        ));
        console.log(response);
        if (response.success === true) {
            fact.id = response.data.id;
        }
    }

    async delete(id: string, parent: string) {
        const payload = {
            id,
            parent,
        };
        const response = await firstValueFrom(this.http.post<ApiResponse>(environment.apiUrl + "/supabase/crud",
            payload,
        ));
        console.log(response);
    }

    async pageFacts(parent: string, cursor?: FactCursorDataType) {
        const payload = {
            cursor,
            parent,
        };
        const response = await firstValueFrom(this.http.post<ApiResponse>(environment.apiUrl + "/supabase/page",
            payload,
        ));
        const rows: KnowledgeDataType[] = (response.data.rows as any[]).map((row) => {
            const id = row.id;
            const metadata = row.metadata as KnowledgeDataType;
            metadata.id = id;
            return metadata;
        });
        const next = response.data.nextCursor;
        return {
            rows,
            next,
        };
    }
}