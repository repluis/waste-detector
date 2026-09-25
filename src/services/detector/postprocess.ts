import { ErrorCode, ModelError } from '@/core/errors'
import type { BoundingBox } from '@/types/detection'
import { nms, type ScoredBox } from './nms'
import type { LetterboxInfo } from './preprocess'

export interface DecodeOptions {
  info: LetterboxInfo
  srcWidth: number
  srcHeight: number
  scoreThreshold: number
  iouThreshold: number
  maxDetections: number
}

/**
 * Decodifica la salida de un YOLO exportado a ONNX. Soporta los dos formatos habituales:
 *  - end2end  [1, N, 6]      → x1, y1, x2, y2, score, classId (YOLOv10 / YOLO26, NMS integrado)
 *  - raw      [1, 4+nc, N]   → cx, cy, w, h, score_c0..score_cn (YOLOv8 / YOLO11, requiere NMS)
 */
export type YoloOutputFormat = 'end2end' | 'raw'

export function detectOutputFormat(dims: readonly number[]): YoloOutputFormat {
  if (dims.length === 3 && dims[2] === 6) return 'end2end'
  if (dims.length === 3 && dims[1]! > 4) return 'raw'
  throw new ModelError({
    code: ErrorCode.MODEL_OUTPUT_UNSUPPORTED,
    message: `Salida de modelo inesperada: [${dims.join(', ')}]`,
    context: { dims: [...dims], esperado: '[1, N, 6] o [1, 4+nc, N]' },
  })
}

export function decodeYoloOutput(
  output: Float32Array,
  dims: readonly number[],
  opts: DecodeOptions,
): ScoredBox[] {
  return detectOutputFormat(dims) === 'end2end'
    ? decodeEnd2End(output, dims[1]!, opts)
    : decodeRaw(output, dims[1]!, dims[2]!, opts)
}

function decodeEnd2End(out: Float32Array, count: number, opts: DecodeOptions): ScoredBox[] {
  const results: ScoredBox[] = []
  for (let i = 0; i < count && results.length < opts.maxDetections; i++) {
    const base = i * 6
    const score = out[base + 4]!
    if (score < opts.scoreThreshold) continue
    results.push({
      classId: Math.round(out[base + 5]!),
      score,
      box: toSourceBox(out[base]!, out[base + 1]!, out[base + 2]!, out[base + 3]!, opts),
    })
  }
  return results
}

function decodeRaw(out: Float32Array, channels: number, anchors: number, opts: DecodeOptions): ScoredBox[] {
  const numClasses = channels - 4
  const candidates: ScoredBox[] = []

  for (let j = 0; j < anchors; j++) {
    let best = 0
    let classId = -1
    for (let c = 0; c < numClasses; c++) {
      const s = out[(4 + c) * anchors + j]!
      if (s > best) {
        best = s
        classId = c
      }
    }
    if (best < opts.scoreThreshold) continue

    const cx = out[j]!
    const cy = out[anchors + j]!
    const w = out[2 * anchors + j]!
    const h = out[3 * anchors + j]!
    candidates.push({
      classId,
      score: best,
      box: toSourceBox(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, opts),
    })
  }

  return nms(candidates, opts.iouThreshold, opts.maxDetections)
}

/** Deshace el letterbox: coordenadas del tensor → píxeles del frame original. */
function toSourceBox(x1: number, y1: number, x2: number, y2: number, opts: DecodeOptions): BoundingBox {
  const { scale, padX, padY } = opts.info
  const clampX = (v: number) => Math.min(Math.max(v, 0), opts.srcWidth)
  const clampY = (v: number) => Math.min(Math.max(v, 0), opts.srcHeight)
  const left = clampX((x1 - padX) / scale)
  const top = clampY((y1 - padY) / scale)
  const right = clampX((x2 - padX) / scale)
  const bottom = clampY((y2 - padY) / scale)
  return { x: left, y: top, width: right - left, height: bottom - top }
}
