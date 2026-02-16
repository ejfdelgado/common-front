import { Injectable } from "@angular/core";
import { IndicatorService } from "./indicator.service";

export interface ItemToSearchType {
    id: string;
    title: string;
    url: string;
};

export type SearchLangsType = "en" | "es" | "multi";

export interface SearchAnswerDataType {
    type: string;
    success: boolean;
    payload: ItemToSearchType[];
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

    async initialize(payload: ItemToSearchType[], lang: SearchLangsType = "en") {
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
            this.worker.postMessage({ type: "INITIALIZE", payload, lang });
        });
        promise.finally(() => {
            indicator.done();
        });
        return promise;
    }

    async search(payload: string, lang: SearchLangsType = "en"): Promise<SearchAnswerDataType> {
        const indicator = this.indicatorSrv.start();
        const promise = new Promise<SearchAnswerDataType>((resolve, reject) => {
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
            this.worker.postMessage({ type: "SEARCH", payload, lang });
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