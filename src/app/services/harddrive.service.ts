import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, firstValueFrom, map } from 'rxjs';
import { environment } from 'environments/environment';
import { ApiResponse, UploadResponse } from 'types/file';

export interface HardDriveOptionsType {

}

@Injectable({
    providedIn: 'root',
})
export class HardDriveService {
    private readonly uploadUrl = 'harddrive/file';

    constructor(private http: HttpClient) { }

    upload(
        filePath: string,
        blob: Blob,
        options?: HardDriveOptionsType,
    ): Promise<UploadResponse> {
        const formData = new FormData();
        const fileName = filePath.split('/').pop();
        formData.append('file_path', filePath);
        formData.append('file', blob, fileName);

        return firstValueFrom(this.http.post<UploadResponse>(environment.apiUrl + this.uploadUrl, formData));
    }

    delete(
        bucketPath: string,
        options?: any,
    ): Promise<ApiResponse> {
        const parameters: any = {
            file_path: bucketPath,
        };
        const query = new URLSearchParams(parameters).toString();
        return firstValueFrom(this.http.delete<ApiResponse>(`${environment.apiUrl}${this.uploadUrl}?${query}`));
    }
}
