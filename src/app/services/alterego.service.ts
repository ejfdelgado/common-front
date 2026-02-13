import { Injectable } from "@angular/core";
import { IndicatorService } from "./indicator.service";

export interface ItemToSearchType {
    id: string;
    title: string;
    url: string;
}

@Injectable({
    providedIn: 'root',
})
export class AlterEgoService {

    worker!: Worker;

    constructor(
        private indicatorSrv: IndicatorService,
    ) {
        this.worker = new Worker(
            new URL('./search.worker', import.meta.url),
            { type: 'module' }
        );
    }

    async initialize(payload: ItemToSearchType[]) {
        const indicator = this.indicatorSrv.start();
        const promise = new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error("Worker not loaded"));
                return;
            };
            this.worker.onmessage = ({ data }) => {
                if (!data.success) {
                    reject(data.payload);
                } else {
                    resolve(data);
                }
            };
            this.worker.postMessage({ type: "INITIALIZE", payload });
        });
        promise.finally(() => {
            indicator.done();
        });
        return promise;
    }

    async search(payload: string) {
        const indicator = this.indicatorSrv.start();
        const promise = new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error("Worker not loaded"));
                return;
            };
            this.worker.onmessage = ({ data }) => {
                if (!data.success) {
                    reject(data.payload);
                } else {
                    resolve(data);
                }
            };
            this.worker.postMessage({ type: "SEARCH", payload });
        });
        promise.finally(() => {
            indicator.done();
        });
        return promise;
    }

    async echo() {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error("Worker not loaded"));
                return;
            };
            this.worker.onmessage = ({ data }) => {
                resolve(data);
            };
            this.worker.postMessage({ type: "ECHO", payload: "Hello!" });
        });
    }
}