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

/**
 * Modelo actual: YOLOv10n preentrenado en COCO (placeholder).
 * Cuando entrenes tu modelo de residuos, reemplaza el .onnx y cambia `labels`
 * por tus clases (p. ej. WASTE_CATEGORY_IDS) — el resto del pipeline no cambia.
 */
export const MODEL_CONFIG: ModelConfig = {
  url: import.meta.env.VITE_MODEL_URL ?? `${import.meta.env.BASE_URL}models/waste-detector.onnx`,
  // URL absoluta a propósito: con una ruta relativa, Vite (dev) añade "?import" al import dinámico
  // de onnxruntime y se niega a servir el archivo desde /public.
  wasmPath: new URL(`${import.meta.env.BASE_URL}ort/`, location.origin).href,
  inputSize: 640,
  labels: COCO_LABELS,
  scoreThreshold: Number(import.meta.env.VITE_SCORE_THRESHOLD ?? 0.4),
  iouThreshold: 0.45,
  // Alto a propósito: se filtra a "solo residuos" después, y no queremos que
  // personas u otros objetos ocupen el cupo antes del filtro.
  maxDetections: 100,
}
