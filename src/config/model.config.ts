import { COCO_LABELS } from './labels/coco'

export interface ModelConfig {
  url: string
  /** Carpeta con el runtime WASM de onnxruntime-web (copiado por scripts/copy-ort-assets.mjs). */
  wasmPath: string
  /** Lado del tensor cuadrado de entrada (imgsz con el que se exportó el modelo). */
  inputSize: number
  /** Nombres de clase en el orden de los índices del modelo. */
  labels: readonly string[]
  scoreThreshold: number
  /** Solo se usa con salidas "raw" (YOLOv8/11 sin NMS integrado). */
  iouThreshold: number
  maxDetections: number
}

const DEFAULT_MODEL_PATH = `${import.meta.env.BASE_URL}models/waste-detector.onnx`
const DEFAULT_SCORE_THRESHOLD = 0.4

/**
 * Tolera errores típicos al configurar VITE_MODEL_URL en Vercel/.env:
 * vacía, con comillas, con prefijo "public/" o sin "/" inicial. Siempre devuelve una URL absoluta.
 */
function resolveModelUrl(raw: string | undefined): string {
  let value = (raw ?? '').trim().replace(/^['"]|['"]$/g, '')
  if (!value) return new URL(DEFAULT_MODEL_PATH, location.origin).href
  if (/^https?:\/\//i.test(value)) return value
  value = value.replace(/^\.?\/?public\//, '/') // public/ es carpeta de origen, no se publica con ese nombre
  if (!value.startsWith('/')) value = `/${value}`
  return new URL(value, location.origin).href
}

function resolveScoreThreshold(raw: string | undefined): number {
  const value = Number.parseFloat(raw ?? '')
  return value > 0 && value < 1 ? value : DEFAULT_SCORE_THRESHOLD
}

/**
 * Modelo actual: YOLOv10n preentrenado en COCO (placeholder).
 * Cuando entrenes tu modelo de residuos, reemplaza el .onnx y cambia `labels`
 * por tus clases (p. ej. WASTE_CATEGORY_IDS) — el resto del pipeline no cambia.
 */
export const MODEL_CONFIG: ModelConfig = {
  url: resolveModelUrl(import.meta.env.VITE_MODEL_URL),
  // URL absoluta a propósito: con una ruta relativa, Vite (dev) añade "?import" al import dinámico
  // de onnxruntime y se niega a servir el archivo desde /public.
  wasmPath: new URL(`${import.meta.env.BASE_URL}ort/`, location.origin).href,
  inputSize: 640,
  labels: COCO_LABELS,
  scoreThreshold: resolveScoreThreshold(import.meta.env.VITE_SCORE_THRESHOLD),
  iouThreshold: 0.45,
  // Alto a propósito: se filtra a "solo residuos" después, y no queremos que
  // personas u otros objetos ocupen el cupo antes del filtro.
  maxDetections: 100,
}
