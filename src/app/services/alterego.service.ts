import { Injectable } from "@angular/core";
import { IndicatorService } from "./indicator.service";

import { pipeline, env, FeatureExtractionPipeline } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

let extractor: FeatureExtractionPipeline;

export interface ItemToSearchType {
    id: string;
    title: string;
}

@Injectable({
    providedIn: 'root',
})
export class AlterEgoService {
    worker!: Worker;

    constructor(
        private indicatorSrv: IndicatorService,
    ) {
        /*
        this.worker = new Worker(
            new URL('./search.worker', import.meta.url),
            { type: 'module' }
        );
        */
        console.log("worker loaded...");
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

        console.log(dataWithEmbeddings);

        //index = new Voy({ embeddings: dataWithEmbeddings });
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