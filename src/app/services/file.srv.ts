import { Injectable } from "@angular/core";
import { BucketService } from "./bucket.service";
import { HardDriveService } from "./harddrive.service";
import { ApiResponse, UploadResponse } from "types/file";
import { CameraCaptureComponent } from "@components/camera-capture/camera-capture";
import { firstValueFrom, map } from 'rxjs';
import { HttpClient } from "@angular/common/http";

export type StorageType = "bucket" | "hard_drive";

@Injectable({
    providedIn: 'root',
})
export class FileService {

    cameraPicker: CameraCaptureComponent | null = null;

    constructor(
        private bucketSrv: BucketService,
        private hardDriveSrv: HardDriveService,
        private http: HttpClient,
    ) {

    }

    setPickerComponent(cameraPicker: CameraCaptureComponent) {
        this.cameraPicker = cameraPicker;
    }

    async openCamera(): Promise<Blob | undefined> {
        return this.cameraPicker?.openCamera();
    }

    pickImageFile(): Promise<Blob> {
        return this.pickFile(
            [
                'image/png',
                'image/jpeg',
            ]
        );
    }

    pickFile(mimeTypes: string[]): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = mimeTypes.join(',');
            input.multiple = false;
            input.style.display = 'none';

            const cleanup = () => {
                input.remove();
            };

            input.onchange = () => {
                const file = input.files?.[0];

                if (!file) {
                    cleanup();
                    reject(new Error('No file selected'));
                    return;
                }

                if (mimeTypes.length && !mimeTypes.includes(file.type)) {
                    cleanup();
                    reject(new Error(`Invalid file type: ${file.type}`));
                    return;
                }

                cleanup();
                resolve(file);
            };

            input.onerror = () => {
                cleanup();
                reject(new Error('File picker error'));
            };

            document.body.appendChild(input);
            input.click();
        });
    }

    upload(
        path: string,
        blob: Blob,
        type: StorageType = "bucket",
        options?: any,
    ): Promise<UploadResponse> {
        if (type == "bucket") {
            return this.bucketSrv.upload(path, blob, options);
        } else if (type == "hard_drive") {
            return this.hardDriveSrv.upload(path, blob, options);
        } else {
            throw new Error("Incorrect option");
        }
    }

    delete(
        path: string,
        type: StorageType = "bucket",
        options?: any,
    ): Promise<ApiResponse> {
        if (type == "bucket") {
            return this.bucketSrv.delete(path, options);
        } else if (type == "hard_drive") {
            return this.hardDriveSrv.delete(path, options);
        } else {
            throw new Error("Incorrect option");
        }
    }

    open(
        path: string,
        type: StorageType = "bucket",
        options?: any,
    ): Promise<ApiResponse> {
        if (type == "bucket") {
            return this.bucketSrv.open(path, options);
        } else if (type == "hard_drive") {
            return this.hardDriveSrv.open(path, options);
        } else {
            throw new Error("Incorrect option");
        }
    }

    async resizeImageBlob(
        inputBlob: Blob,
        maxWidth: number,
        maxHeight: number,
        outputType: string = inputBlob.type,
        quality: number = 0.92
    ): Promise<Blob> {

        // Decode image
        const imageBitmap = await createImageBitmap(inputBlob);

        const { width, height } = imageBitmap;

        // Calculate scale ratio (never upscale)
        const scale = Math.min(
            maxWidth / width,
            maxHeight / height,
            1
        );

        const targetWidth = Math.round(width * scale);
        const targetHeight = Math.round(height * scale);

        // Draw on canvas
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Canvas 2D context not available');
        }

        ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

        // Convert canvas back to Blob
        return new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                blob => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas toBlob failed'));
                },
                outputType,
                quality
            );
        });
    }


    getJSON(url: string): Promise<any> {
        return firstValueFrom(this.http.get(url, { responseType: 'text' }).pipe(
            map(res => {
                return JSON.parse(res);
            })
        ));
    }

}