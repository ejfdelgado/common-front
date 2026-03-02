import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { IndicatorService } from "./indicator.service";
import { firstValueFrom } from "rxjs";
import { ApiResponse } from "types/file";
import { environment } from "environments/environment";
import { User } from '@angular/fire/auth';

export interface QueryUser {
    limit: number;
    offset?: string;
    email?: string;
    phone?: string;
}

@Injectable({
    providedIn: 'root',
})
export class UsersService {
    constructor(
        private http: HttpClient,
        private indicatorSrv: IndicatorService,
    ) { }

    async pageUsers(query: QueryUser): Promise<ApiResponse> {
        const queryParams = new URLSearchParams(query as any).toString();
        const response = await firstValueFrom(this.http.get<ApiResponse>(environment.apiUrl + "admin/users?" + queryParams));
        return response;
    }

    async listRoles(user: User) {
        const queryParams = new URLSearchParams({
            uid: user.uid,
        }).toString();
        const response = await firstValueFrom(this.http.get<ApiResponse>(environment.apiUrl + "admin/user/roles?" + queryParams));
        if (response.success) {
            const keys = Object.keys(response.data);
            return keys;
        } else {
            throw new Error(response.message);
        }
    }

    async writeRoles(user: User, roles: string[]) {
        const model = {
            uid: user.uid,
            roles,
        };
        const response = await firstValueFrom(this.http.put<ApiResponse>(environment.apiUrl + "admin/user/roles_all", model));
        if (response.success) {
            const keys = Object.keys(response.data);
            return keys;
        } else {
            throw new Error(response.message);
        }
    }

    async getSharedUsers(collection: string, id: string): Promise<User[]> {
        const queryParams = new URLSearchParams({
            collection,
            id,
        }).toString();
        const response = await firstValueFrom(this.http.get<ApiResponse>(environment.apiUrl + "admin/user/shared_with?" + queryParams));
        if (response.success) {
            return response.data;
        } else {
            throw new Error(response.message);
        }

    }
}