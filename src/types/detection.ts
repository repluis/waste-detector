export type WasteCategoryId =
  | 'plastic'
  | 'paper'
  | 'cardboard'
  | 'glass'
  | 'metal'
  | 'organic'
  | 'electronic'

export interface WasteCategory {
  id: WasteCategoryId
  name: string
  /** Color del recuadro y la etiqueta en pantalla. */
  color: string
  /** Contenedor donde debe desecharse. */
  bin: string
}

/** Recuadro en píxeles de la imagen original (el frame del video). */
export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

/** Salida genérica del modelo, independiente del dominio de residuos. */
export interface RawDetection {
  classId: number
  label: string
  score: number
  box: BoundingBox
}

export interface WasteDetection extends RawDetection {
  category: WasteCategory
}

export type ExecutionBackend = 'webgpu' | 'wasm'

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface DetectionResult {
  detections: RawDetection[]
  inferenceMs: number
}

/**
 * Contrato de cualquier detector. Permite cambiar la implementación
 * (ONNX en hilo principal, Web Worker, otro runtime) sin tocar la UI.
 */
export interface Detector {
  load(): Promise<ExecutionBackend>
  detect(source: CanvasImageSource, width: number, height: number): Promise<DetectionResult>
  dispose(): Promise<void>
}
