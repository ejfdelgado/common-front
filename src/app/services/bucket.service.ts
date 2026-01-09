import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, firstValueFrom, map } from 'rxjs';
import { environment } from 'environments/environment';
import { ApiResponse, UploadResponse } from 'types/file';

export interface BucketOptionsType {
    bucketName?: string;
    makePublic?: boolean;
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

        return firstValueFrom(this.http.post<UploadResponse>(`${environment.apiUrl}${this.uploadUrl}`, formData));
    }

    delete(
        bucketPath: string,
        options?: BucketOptionsType,
    ): Promise<ApiResponse> {
        const parameters: any = {
            file_path: bucketPath,
        };
        if (options?.bucketName) {
            parameters.bucket_name = options?.bucketName;
        };
        const query = new URLSearchParams(parameters).toString();
        return firstValueFrom(this.http.delete<ApiResponse>(`${environment.apiUrl}${this.uploadUrl}?${query}`));
    }
}
