import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "environments/environment";
import { firstValueFrom } from "rxjs";
import { ApiResponse } from "types/file";


@Injectable({
    providedIn: 'root',
})
export class CalendarService {
    constructor(
        private http: HttpClient,
    ) {

    }

    async search(parent: string, toolId: string, text: string) {
        const payload = {
            parent,
            toolId,
            text,
        };
        const response: ApiResponse = await firstValueFrom(
            this.http.post<ApiResponse>(environment.apiUrl + "calendar/search",
                payload,
            ));
        console.log(JSON.stringify(response, null, 4));
    }
}