import { AppError, ErrorCode } from '@/core/errors'
import { applyFilters } from '@/services/image/filters'
import type { FilterId, FilterSettings, InputPreview } from '@/types/image'

/** Cómo se escaló/rellenó el frame para caber en el tensor cuadrado. */
export interface LetterboxInfo {
  scale: number
  padX: number
  padY: number
}

export interface PreprocessResult {
  data: Float32Array
  info: LetterboxInfo
  contentWidth: number
  contentHeight: number
  activeFilters: FilterId[]
  filtersMs: number
}

const PAD_VALUE = 114 // mismo gris de relleno que usa Ultralytics
const PAD_COLOR = `rgb(${PAD_VALUE}, ${PAD_VALUE}, ${PAD_VALUE})`
const INV_255 = 1 / 255

/**
 * Convierte un frame en un tensor NCHW float32 [1, 3, size, size] normalizado a 0-1:
 *   1. letterbox (escala manteniendo proporción, relleno gris)
 *   2. filtros opcionales, solo sobre la zona del frame (no sobre el relleno)
 *   3. normalización /255 y reordenado HWC → CHW
 * Reutiliza canvas y buffer entre frames. El canvas queda con la imagen filtrada (vista "modelo").
 */
export class Preprocessor {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly buffer: Float32Array
  private readonly size: number
  private geometryKey = ''
  private preview: InputPreview | null = null

  constructor(size: number) {
    this.size = size
    this.canvas = document.createElement('canvas')
    this.canvas.width = size
    this.canvas.height = size
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      throw new AppError({
        code: ErrorCode.CANVAS_UNAVAILABLE,
        message: 'No se pudo crear el canvas de preprocesado',
        context: { size },
      })
    }
    this.ctx = ctx
    this.buffer = new Float32Array(3 * size * size)
  }

  run(source: CanvasImageSource, srcWidth: number, srcHeight: number, filters?: FilterSettings): PreprocessResult {
    const { size, ctx, buffer } = this
    const scale = Math.min(size / srcWidth, size / srcHeight)
    const drawW = Math.round(srcWidth * scale)
    const drawH = Math.round(srcHeight * scale)
    const padX = Math.floor((size - drawW) / 2)
    const padY = Math.floor((size - drawH) / 2)

    // El relleno solo cambia si cambia la resolución de la cámara.
    const key = `${drawW}x${drawH}`
    if (key !== this.geometryKey) {
      this.geometryKey = key
      buffer.fill(PAD_VALUE * INV_255)
      ctx.fillStyle = PAD_COLOR
      ctx.fillRect(0, 0, size, size)
      this.preview = { canvas: this.canvas, x: padX, y: padY, width: drawW, height: drawH }
    }

    // 1. Letterbox
    ctx.drawImage(source, padX, padY, drawW, drawH)
    const img = ctx.getImageData(padX, padY, drawW, drawH)

    // 2. Filtros
    const t0 = performance.now()
    const activeFilters = filters ? applyFilters(img, filters) : []
    const filtersMs = performance.now() - t0
    if (activeFilters.length) ctx.putImageData(img, padX, padY)

    // 3. Normalización + HWC → CHW
    const { data } = img
    const area = size * size
    for (let y = 0; y < drawH; y++) {
      let t = (y + padY) * size + padX
      let p = y * drawW * 4
      for (let x = 0; x < drawW; x++, t++, p += 4) {
        buffer[t] = data[p]! * INV_255
        buffer[t + area] = data[p + 1]! * INV_255
        buffer[t + 2 * area] = data[p + 2]! * INV_255
      }
    }

    return {
      data: buffer,
      info: { scale, padX, padY },
      contentWidth: drawW,
      contentHeight: drawH,
      activeFilters,
      filtersMs,
    }
  }

  /** Imagen del último frame tal como la recibe el modelo (ya filtrada). */
  getPreview(): InputPreview | null {
    return this.preview
  }
}
