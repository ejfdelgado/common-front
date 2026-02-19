import { Injectable } from "@angular/core";
import { IndicatorService, Wait } from "./indicator.service";

export interface ItemToSearchType {
    id: string;
    title: string;
    url: string;
    distance?: number;
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
    ready!: Promise<void>;

    constructor(
        private indicatorSrv: IndicatorService,
    ) {
        this.worker = new Worker(
            new URL('./search.worker', import.meta.url),
            { type: 'module' }
        );
        this.ready = new Promise((resolve, reject) => {
            this.worker.onmessage = (event) => {
                if (event.data.type === 'READY') {
                    resolve();
                }
            };
            this.worker.onerror = (err: any) => {
                reject(err);
            }
        });
    }

    async initialize(payload: ItemToSearchType[], lang: SearchLangsType = "en", useIndicator: boolean = true) {
        let indicator: Wait | null = null;
        if (useIndicator) {
            indicator = this.indicatorSrv.start();
        }
        await this.ready;
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
            if (indicator) {
                indicator.done();
            }
        });
        return promise;
    }

    async search(payload: string, top: number = 10, distance: number = 0.3, lang: SearchLangsType = "en", useIndicator: boolean = true): Promise<SearchAnswerDataType> {
        let indicator: Wait | null;
        if (useIndicator) {
            indicator = this.indicatorSrv.start();
        }
        await this.ready;
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
            this.worker.postMessage({
                type: "SEARCH",
                payload,
                lang,
                top,
                distance,
            });
        });
        promise.finally(() => {
            if (indicator) {
                indicator.done();
            }
        });
        return promise;
    }

    async echo() {
        await this.ready;
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