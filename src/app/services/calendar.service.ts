import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "environments/environment";
import { firstValueFrom } from "rxjs";
import { ApiResponse } from "types/file";
import { CalendarEventType } from "types/ragTypes";


@Injectable({
    providedIn: 'root',
})
export class CalendarService {
    constructor(
        private http: HttpClient,
    ) {

    }

    async search(parent: string, toolId: string, max: number = 3, hoursGap: number = 0, text?: string) {
        const payload: any = {
            parent,
            toolId,
            max,
            hoursGap,
        };
        if (text) {
            payload.text = text;
        }
        const response: ApiResponse = await firstValueFrom(
            this.http.post<ApiResponse>(environment.apiUrl + "calendar/search",
                payload,
            ));
        if (response.success) {
            const events: CalendarEventType[] = response.data;
            return events;
        }
        return null;
    }
}