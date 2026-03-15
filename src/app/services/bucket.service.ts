import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, firstValueFrom, map } from 'rxjs';
import { environment } from 'environments/environment';
import { ApiResponse, UploadResponse } from 'types/file';
import { IndicatorService } from './indicator.service';
import { UINotificationSrv } from './uinotifications.service';

export interface BucketOptionsType {
    bucketName?: string;
    makePublic?: boolean;
}

@Injectable({
    providedIn: 'root',
})
export class BucketService {
    private readonly uploadUrl = 'bucket/file';

    constructor(
        private http: HttpClient,
        private indicatorSrv: IndicatorService,
        private notifSrv: UINotificationSrv,
    ) { }

    /**
     * Upload a blob to backend
     */
    async upload(
        bucketPath: string,
        blob: Blob,
        options?: BucketOptionsType,
    ): Promise<UploadResponse> {
        const indicator = this.indicatorSrv.start();
        try {
            const formData = new FormData();
            const fileName = bucketPath.split('/').pop();
            if (options?.bucketName) {
                formData.append('bucket_name', options?.bucketName);
            }
            formData.append('file_path', bucketPath);
            formData.append('file', blob, fileName);
            formData.append('make_public', options?.makePublic === true ? "1" : "0");

            const response = await firstValueFrom(this.http.post<UploadResponse>(`${environment.apiUrl}${this.uploadUrl}`, formData));
            return response;
        } catch (err: any) {
            this.notifSrv.show(err.message);
            throw err;
        } finally {
            indicator.done();
        }
    }

    delete(
        bucketPath: string,
        options?: BucketOptionsType,
    ): Promise<ApiResponse> {
        const indicator = this.indicatorSrv.start();
        try {
            const parameters: any = {
                file_path: bucketPath,
            };
            if (options?.bucketName) {
                parameters.bucket_name = options?.bucketName;
            };
            const query = new URLSearchParams(parameters).toString();
            const response = firstValueFrom(this.http.delete<ApiResponse>(`${environment.apiUrl}${this.uploadUrl}?${query}`));
            return response;
        } catch (err: any) {
            this.notifSrv.show(err.message);
            throw err;
        } finally {
            indicator.done();
        }
    }

    async open(
        bucketPath: string,
        options?: BucketOptionsType,
    ): Promise<any> {
        const parameters: any = {
            file_path: bucketPath,
        };
        if (options?.bucketName) {
            parameters.bucket_name = options?.bucketName;
        };
        const query = new URLSearchParams(parameters).toString();
        window.open(`${environment.apiUrl}public/${this.uploadUrl}?${query}`);
    }
}
