import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "environments/environment";
import { firstValueFrom } from "rxjs";

export interface EmailDataType {
    debug?: boolean;
    body: {
        to: string;
        subject: string;
        replyTo?: string;
        template: string;
        params: any,
        bucketName?: string,
    }
}

@Injectable({
    providedIn: 'root',
})
export class EmailService {

    constructor(
        private http: HttpClient,
    ) {

    }

    async send(config: EmailDataType) {
        const response = await firstValueFrom(this.http.post(environment.apiUrl + "srv/email/send",
            config,
        ));
        console.log(JSON.stringify(response, null, 4));
    }
}