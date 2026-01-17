import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "environments/environment";
import { firstValueFrom } from "rxjs";
import { ApiResponse } from "types/file";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export interface UpdatedEntityType {
    id: string;
}

export interface BasicDataType extends UpdatedEntityType {
    title: string;
    description: string;
    author: string;
    author_name: string;
    author_picture: string;
    created: number;
    updated: number;
}

@Injectable({
    providedIn: 'root',
})
export class FirestoreService {

    private readonly uploadUrl = 'firestore';

    constructor(private http: HttpClient) { }

    async createUpdate(collection: string, data: any, conf: any = {}): Promise<UpdatedEntityType> {
        const payload: any = {
            collection,
            data,
            conf,
        };
        const response = await firstValueFrom(this.http.post<ApiResponse>(environment.apiUrl + this.uploadUrl, payload));
        if (typeof response.data.id == "string") {
            return { id: response.data.id };
        } else {
            throw new Error("No id found");
        }
    }

    async paging(collectionName: string): Promise<BasicDataType[]> {
        const snap = await getDocs(collection(db, collectionName));
        return (snap.docs.map(d => ({
            id: d.id,
            ...d.data()
        }))) as BasicDataType[];
    }
}