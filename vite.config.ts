import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defaultClientConditions, defineConfig } from 'vite'

// Cross-origin isolation habilita SharedArrayBuffer → WASM multi-hilo en onnxruntime-web.
const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    // Build de onnxruntime-web SIN el runtime WASM embebido: se carga desde /ort/
    // (ver scripts/copy-ort-assets.mjs). Evita que los workers WASM ejecuten el bundle de la app.
    conditions: ['onnxruntime-web-use-extern-wasm', ...defaultClientConditions],
  },
  optimizeDeps: {
    // onnxruntime-web carga sus .wasm dinámicamente; el pre-bundling de Vite rompe esas rutas.
    exclude: ['onnxruntime-web'],
  },
  server: {
    headers: isolationHeaders,
  },
  preview: {
    headers: isolationHeaders,
  },
})
