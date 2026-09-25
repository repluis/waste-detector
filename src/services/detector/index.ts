import { MODEL_CONFIG } from '@/config/model.config'
import type { Detector } from '@/types/detection'
import { OnnxYoloDetector } from './onnx-detector'

/** Punto único de creación: cambia aquí la implementación (p. ej. un detector en Web Worker). */
export function createDetector(): Detector {
  return new OnnxYoloDetector(MODEL_CONFIG)
}

export type { Detector }
