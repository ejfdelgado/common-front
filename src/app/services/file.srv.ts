import { Injectable } from "@angular/core";
import { BucketService } from "./bucket.service";
import { HardDriveService } from "./harddrive.service";
import { ApiResponse, UploadResponse } from "types/file";
import { CameraCaptureComponent } from "@components/camera-capture/camera-capture";
import { Observable, Subject } from 'rxjs';

export type StorageType = "bucket" | "hard_drive";

@Injectable({
    providedIn: 'root',
})
export class FileService {

    cameraPicker: CameraCaptureComponent | null = null;

    constructor(
        private bucketSrv: BucketService,
        private hardDriveSrv: HardDriveService,
    ) {

    }

    setPickerComponent(cameraPicker: CameraCaptureComponent) {
        this.cameraPicker = cameraPicker;
    }

    async openCamera(): Promise<Blob | undefined> {
        return this.cameraPicker?.openCamera();
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
}