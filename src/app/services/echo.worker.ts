/// <reference lib="webworker" />

self.onmessage = async (e) => {
  const { type, payload } = e.data;
  if (type === 'ECHO') {
    self.postMessage({ type: 'ECHO_RESULTS', payload: payload });
  }
};