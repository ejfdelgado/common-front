import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, firstValueFrom, map } from 'rxjs';
import { environment } from 'environments/environment';
import { UploadResponse } from 'types/file';

export interface HardDriveOptionsType {

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
}
