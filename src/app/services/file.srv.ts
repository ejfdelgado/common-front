import { Injectable } from "@angular/core";
import { BucketService } from "./bucket.service";
import { HardDriveService } from "./harddrive.service";
import { UploadResponse } from "types/file";

@Injectable({
    providedIn: 'root',
})
export class FileService {
    constructor(
        private bucketSrv: BucketService,
        private hardDriveSrv: HardDriveService,
    ) {

    }
    upload(
        path: string,
        blob: Blob,
        type: "bucket" | "hard_drive" = "bucket",
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
}