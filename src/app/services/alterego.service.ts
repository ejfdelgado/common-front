import { Injectable } from "@angular/core";
import { IndicatorService } from "./indicator.service";
import { pipeline, env, FeatureExtractionPipeline } from '@huggingface/transformers';
import { Voy } from 'voy-search';

env.allowLocalModels = false;
env.useBrowserCache = true;

let extractor: FeatureExtractionPipeline;
let index: Voy;

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

        console.log("worker loaded...");
    }

    async initializeWorker(payload: ItemToSearchType[]) {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error("Not loaded"));
                return;
            };

            this.worker.onmessage = ({ data }) => {
                console.log(JSON.stringify(data));
                resolve(data);
            };
            console.log("initialize!");
            this.worker.postMessage({
                type: "INITIALIZE",
                payload: payload,
            });
        });
    }

    async searchWorker(payload: string) {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error("Not loaded"));
                return;
            };

            this.worker.onmessage = ({ data }) => {
                console.log(JSON.stringify(data));
                resolve(data);
            };

            this.worker.postMessage({
                type: "SEARCH",
                payload: payload,
            });
        });
    }

    async initialize(payload: ItemToSearchType[]) {
        extractor = (await pipeline(
            'feature-extraction',
            'Xenova/all-MiniLM-L6-v2'
        )) as unknown as FeatureExtractionPipeline;

        // Generate embeddings for the initial data
        const dataWithEmbeddings = await Promise.all(payload.map(async (item: any) => {
            const output = await extractor(item.title, { pooling: 'mean', normalize: true });
            return { ...item, embeddings: Array.from(output.data as Float32Array) };
        }));

        index = new Voy({ embeddings: dataWithEmbeddings });
    }

    async search(payload: string) {
        const queryOutput = await extractor(payload, { pooling: 'mean', normalize: true });
        const queryVector = new Float32Array(queryOutput.data as Float32Array);

        const results = index.search(queryVector, 3);
        return { type: 'SEARCH_RESULTS', payload: results.neighbors };
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