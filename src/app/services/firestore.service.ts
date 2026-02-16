import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "environments/environment";
import { firstValueFrom, Subject } from "rxjs";
import { ApiResponse } from "types/file";
import { collection, getDocs, query, orderBy, limit, onSnapshot, Unsubscribe, where, QueryConstraint, startAfter, getDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import { MyUtilities } from "ejfdelgado-common-ts";

export interface PageDataType {
    collectionName: string;
    searchText?: string | null;
    lastDoc?: any;
    orderColumn?: string;
    orderDirection?: "asc" | "desc";
    author?: string | null;
    owner?: string | null;
    top?: number;
};

export interface FirestoreConfigDataType {
    autoAuthor?: boolean;
    searchFields?: string[],
}

export interface UpdatedEntityType {
    id: string;
}

export interface SimpleDataType extends UpdatedEntityType {
    created: number;
    updated: number;
}

export interface BasicDataType extends SimpleDataType {
    title: string;
    description: string;
    author: string;
    author_name: string;
    author_picture: string;
}

@Injectable({
    providedIn: 'root',
})
export class FirestoreService {

    private readonly uploadUrl = 'firestore';

    constructor(private http: HttpClient) { }

    expandCollection(collection: string) {
        const prefix = environment.env ? environment.env : "pro";
        return collection.split("/").map((el, index) => {
            if (index % 2 == 0) {
                //collection name
                return prefix + "-" + el
            } else {
                //id
                return el;
            }
        }).join("/");
    }

    async createUpdate(collection: string, data: any, conf: FirestoreConfigDataType = {}): Promise<UpdatedEntityType> {
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

    livePaging(
        collectionName: string,
        callback: Function,
        orderColumn: string = "created",
        orderDirection: "asc" | "desc" = "desc",
        top: number = 10,
    ): Unsubscribe {
        const q = query(
            collection(db, this.expandCollection(collectionName)),
            orderBy(orderColumn, orderDirection),
            limit(top)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));

            callback(items);
        });

        return unsubscribe;
    }

    async readById(collectionName: string, id: string) {
        const snap = await getDoc(doc(db, this.expandCollection(collectionName), id));

        if (snap.exists()) {
            const data = snap.data();
            data['id'] = id;
            return data;
        }
        return null;
    }

    async paging(
        requestIn: PageDataType
    ): Promise<BasicDataType[]> {

        const request: PageDataType = Object.assign({
            searchText: null,
            lastDoc: null,
            orderColumn: "created",
            orderDirection: "desc",
            searchTextSingle: false,
            top: 10
        }, requestIn);

        const colRef = collection(db, this.expandCollection(request.collectionName));

        const constraints: QueryConstraint[] = [];

        if (typeof request.searchText == "string") {
            const tokens = MyUtilities.partirTexto(request.searchText, false);
            constraints.push(where('search', 'array-contains-any', tokens));
        }
        const usedOrderBy = request.orderColumn ? request.orderColumn : "created";
        constraints.push(orderBy(usedOrderBy, request.orderDirection));

        if (typeof request.author == "string") {
            constraints.push(where('author', '==', request.author));
        }

        if (typeof request.owner == "string") {
            constraints.push(where('owners', 'array-contains', request.owner));
        }

        if (request.lastDoc) {
            constraints.push(startAfter(request.lastDoc[usedOrderBy]));
        }

        constraints.push(limit(request.top ? request.top : 10));

        const q = query(
            colRef,
            ...constraints,
        );

        const snap = await getDocs(q);
        return (snap.docs.map(d => ({
            id: d.id,
            ...d.data()
        }))) as BasicDataType[];
    }

    async delete(collection: string, id: string) {
        const parameters = { collection, id };
        const query = new URLSearchParams(parameters).toString();
        const response = await firstValueFrom(this.http.delete<ApiResponse>(`${environment.apiUrl}${this.uploadUrl}?${query}`));
        return response;
    }
}