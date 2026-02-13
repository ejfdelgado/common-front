import { pipeline, env, FeatureExtractionPipeline } from '@huggingface/transformers';
import { Voy } from 'voy-search';

env.useBrowserCache = true;

let extractor: FeatureExtractionPipeline;
let index: Voy;

// Listen for messages from the Main Thread
self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    if (type === 'INITIALIZE') {
        // Load model
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
        self.postMessage({ type: 'READY' });
    }

    if (type === 'SEARCH') {
        const queryOutput = await extractor(payload, { pooling: 'mean', normalize: true });
        const queryVector = new Float32Array(queryOutput.data as Float32Array);

        const results = index.search(queryVector, 3);
        self.postMessage({ type: 'SEARCH_RESULTS', payload: results.neighbors });
    }
};