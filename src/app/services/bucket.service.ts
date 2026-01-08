import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, firstValueFrom, map } from 'rxjs';
import { environment } from 'environments/environment';

export interface BucketOptionsType {
    bucketName?: string;
    makePublic?: boolean;
}

export interface UploadResponse {
    message: string;
    bucket: string;
    path: string;
}

@Injectable({
    providedIn: 'root',
})
export class BucketService {
    private readonly uploadUrl = 'bucket/file';

    constructor(private http: HttpClient) { }

    /**
     * Upload a blob to backend
     */
    upload(
        bucketPath: string,
        blob: Blob,
        options?: BucketOptionsType,
    ): Promise<UploadResponse> {
        const formData = new FormData();
        const fileName = bucketPath.split('/').pop();
        if (options?.bucketName) {
            formData.append('bucket_name', options?.bucketName);
        }
        formData.append('file_path', bucketPath);
        formData.append('file', blob, fileName);
        formData.append('make_public', options?.makePublic === true ? "1" : "0");

        return firstValueFrom(this.http.post<UploadResponse>(environment.apiUrl + this.uploadUrl, formData));
    }

    /**
     * Optional: upload with progress tracking
     */
    uploadWithProgress(
        bucketPath: string,
        blob: Blob,
        bucketName?: string,
    ): Observable<number> {
        const formData = new FormData();
        if (bucketName) {
            formData.append('bucket_name', bucketName);
        }

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
