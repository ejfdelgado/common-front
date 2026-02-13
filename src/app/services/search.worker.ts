/// <reference lib="webworker" />

import { pipeline, env, FeatureExtractionPipeline } from '@huggingface/transformers';
import { Voy } from 'voy-search';

env.useBrowserCache = true;

let extractor: FeatureExtractionPipeline;
let index: Voy | null = null;

self.onmessage = async (e) => {
  const { type, payload } = e.data;
  const RESPONSE_ID = `${type}_RESULT`;

  if (type === 'ECHO') {
    // Echo
    self.postMessage({ type: 'ECHO_RESULTS', payload: payload });
  } else if (type === 'INITIALIZE') {
    // Initialize DB
    try {
      extractor = (await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      )) as unknown as FeatureExtractionPipeline;

      const dataWithEmbeddings = await Promise.all(payload.map(async (item: any) => {
        const output = await extractor(item.title, { pooling: 'mean', normalize: true });
        return { ...item, embeddings: Array.from(output.data as Float32Array) };
      }));

      index = new Voy({ embeddings: dataWithEmbeddings });
      self.postMessage({ type: RESPONSE_ID, success: true });
    } catch (err) {
      self.postMessage({ type: RESPONSE_ID, success: false, payload: err });
    }
  } else if (type === 'SEARCH') {
    // Search DB
    try {
      const queryOutput = await extractor(payload, { pooling: 'mean', normalize: true });
      const queryVector = new Float32Array(queryOutput.data as Float32Array);
      if (!index) {
        throw new Error("index first!");
      }
      const results = index.search(queryVector, 3);
      self.postMessage({ type: RESPONSE_ID, success: true, payload: results.neighbors });
    } catch (err) {
      self.postMessage({ type: RESPONSE_ID, success: false, payload: err });
    }
  }
};
