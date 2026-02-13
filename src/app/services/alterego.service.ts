import { Injectable } from "@angular/core";
import { IndicatorService } from "./indicator.service";

@Injectable({
    providedIn: 'root',
})
export class AlterEgoService {
    worker!: Worker;

    constructor(
        private indicatorSrv: IndicatorService,
    ) {
        this.worker = new Worker(
            new URL('./echo.worker', import.meta.url),
            { type: 'module' }
        );
        console.log("worker loaded...");
    }

    async echo() {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error("Not loaded"));
                return;
            };

            this.worker.onmessage = ({ data }) => {
                console.log(JSON.stringify(data));
                resolve(data);
            };
            console.log("posted!");
            this.worker.postMessage({
                type: "ECHO",
                payload: "Hello!",
            });
        });
    }
}