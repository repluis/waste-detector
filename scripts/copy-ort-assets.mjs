// Copia el runtime WASM de onnxruntime-web a public/ort/ tal cual (sin pasar por Vite).
// Los hilos WASM son Web Workers que cargan este .mjs: si viniera empaquetado dentro de un
// chunk de la app, el worker ejecutaría también Vue/CSS y fallaría con "document is not defined".
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const SRC = 'node_modules/onnxruntime-web/dist'
const DEST = 'public/ort'
const FILES = ['ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm']

mkdirSync(DEST, { recursive: true })
for (const file of FILES) copyFileSync(join(SRC, file), join(DEST, file))
console.log(`[ort] ${FILES.length} archivos copiados a ${DEST}/`)
