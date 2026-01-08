import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, firstValueFrom, map } from 'rxjs';
import { environment } from 'environments/environment';

export interface HardDriveOptionsType {

}

export interface UploadResponse {
    message: string;
    bucket: string;
    path: string;
}

@Injectable({
    providedIn: 'root',
})
export class HardDriveService {
    private readonly uploadUrl = 'harddrive/file';

    constructor(private http: HttpClient) { }

    upload(
        bucketPath: string,
        blob: Blob,
        options?: HardDriveOptionsType,
    ): Promise<UploadResponse> {
        const formData = new FormData();
        const fileName = bucketPath.split('/').pop();
        formData.append('file_path', bucketPath);
        formData.append('file', blob, fileName);

        return firstValueFrom(this.http.post<UploadResponse>(environment.apiUrl + this.uploadUrl, formData));
    }

    uploadWithProgress(
        bucketPath: string,
        blob: Blob
    ): Observable<number> {
        const formData = new FormData();

        const fileName = bucketPath.split('/').pop();

        formData.append('file_path', bucketPath);
        formData.append('file', blob, fileName);

        return this.http.post(this.uploadUrl, formData, {
            reportProgress: true,
            observe: 'events',
        }).pipe(
            map((event: HttpEvent<any>) => {
                if (event.type === HttpEventType.UploadProgress && event.total) {
                    return Math.round((100 * event.loaded) / event.total);
                }
                return 100;
            })
        );
    }
}
