import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "environments/environment";
import { firstValueFrom } from "rxjs";
import { ApiResponse } from "types/file";

export interface UpdatedEntityType {
    id: string;
}

@Injectable({
    providedIn: 'root',
})
export class FirestoreService {

    private readonly uploadUrl = 'public/firestore';

    constructor(private http: HttpClient) { }

    async createUpdate(collection: string, data: any): Promise<UpdatedEntityType> {
        const payload: any = {
            collection,
            data,
        };
        const response = await firstValueFrom(this.http.post<ApiResponse>(environment.apiUrl + this.uploadUrl, payload));
        if (typeof response.data.id == "string") {
            return { id: response.data.id };
        } else {
            throw new Error("No id found");
        }
    }
}