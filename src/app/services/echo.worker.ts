/// <reference lib="webworker" />

import { pipeline, env, FeatureExtractionPipeline } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

let extractor: FeatureExtractionPipeline;

self.onmessage = async (e) => {
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

    self.postMessage({ type: 'READY', payload: dataWithEmbeddings });
  }

  if (type === 'ECHO') {
    self.postMessage({ type: 'ECHO_RESULTS', payload: payload });
  }
};