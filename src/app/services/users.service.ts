import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { IndicatorService } from "./indicator.service";
import { firstValueFrom } from "rxjs";
import { ApiResponse } from "types/file";
import { environment } from "environments/environment";

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
}