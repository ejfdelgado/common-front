import { defineConfig } from 'vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(), // Required for top-level await support
  ],
  optimizeDeps: {
    exclude: ['@huggingface/transformers'], // Prevent pre-bundling issues
    esbuildOptions: {
      target: 'esnext'
    }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      external: ['fs', 'path'] // Node.js polyfills not needed in browser
    }
  }
})