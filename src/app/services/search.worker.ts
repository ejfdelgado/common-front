/// <reference lib="webworker" />

import { pipeline, env, FeatureExtractionPipeline } from '@huggingface/transformers';
import { Voy } from 'voy-search';

env.useBrowserCache = true;

let extractor: FeatureExtractionPipeline | null = null;
let index: Voy | null = null;
let lastLang: string = "";

const MODELS: { [key: string]: string } = {
  "en": 'Xenova/all-MiniLM-L6-v2',//23MB
  "multi": 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',//80MB - 150MB
  "es": 'Xenova/multilingual-e5-small',//40MB
};

const getModelId = function (lang: string) {
  if (!(lang in MODELS)) {
    return MODELS['multi'];
  }
  return MODELS[lang];
}

function cosineSimilarity(a: Float32Array, b: Float32Array) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (normA * normB);
}

const getExtractor = async function (lang: string): Promise<FeatureExtractionPipeline> {
  if (lang != lastLang || extractor === null) {
    extractor = (await pipeline(
      'feature-extraction',
      getModelId(lang)
    )) as unknown as FeatureExtractionPipeline;
    lastLang = lang;
  }
  return extractor;
}

self.onmessage = async (e) => {
  const { type, payload, lang } = e.data;
  const RESPONSE_ID = `${type}_RESULT`;

  if (type === 'ECHO') {
    // Echo
    self.postMessage({ type: 'ECHO_RESULTS', payload: payload });
  } else if (type === 'INITIALIZE') {
    // Initialize DB
    try {
      const localExtractor = await getExtractor(lang);
      const dataWithEmbeddings = await Promise.all(payload.map(async (item: any) => {
        const output = await localExtractor(item.title, { pooling: 'mean', normalize: true });
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
      const localExtractor = await getExtractor(lang);
      const queryOutput = await localExtractor(payload, { pooling: 'mean', normalize: true });
      const queryVector = new Float32Array(queryOutput.data as Float32Array);
      if (!index) {
        throw new Error("index first!");
      }
      const { top, distance } = e.data;
      const results = index.search(queryVector, top);

      const promises = results.neighbors.map((el) => { return el.title }).map((texts: string) => {
        return localExtractor(texts, { pooling: 'mean', normalize: true });
      });
      const resolved = await Promise.all(promises);

      const neighborsVectors = resolved.map((queryOutput: any) => {
        return new Float32Array(queryOutput.data as Float32Array)
      }).map((vector: Float32Array) => {
        return cosineSimilarity(vector, queryVector)
      });
      results.neighbors.forEach((el, index) => {
        (el as any).distance = neighborsVectors[index];
      });
      const filtered = results.neighbors.filter((el) => {
        return (el as any).distance >= distance;
      });
      self.postMessage({ type: RESPONSE_ID, success: true, payload: filtered });
    } catch (err) {
      self.postMessage({ type: RESPONSE_ID, success: false, payload: err });
    }
  }
};
