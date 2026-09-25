import { AppError, ErrorCode } from '@/core/errors'

/** Cómo se escaló/rellenó el frame para caber en el tensor cuadrado. */
export interface LetterboxInfo {
  scale: number
  padX: number
  padY: number
}

const PAD_COLOR = 'rgb(114, 114, 114)' // mismo relleno que usa Ultralytics

/**
 * Convierte un frame en un tensor NCHW float32 [1, 3, size, size] normalizado a 0-1,
 * con letterbox (mantiene proporción y rellena). Reutiliza canvas y buffer entre frames.
 */
export class Preprocessor {
  private readonly ctx: CanvasRenderingContext2D
  private readonly buffer: Float32Array
  private readonly size: number

  constructor(size: number) {
    this.size = size
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
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

  run(source: CanvasImageSource, srcWidth: number, srcHeight: number) {
    const { size, ctx, buffer } = this
    const scale = Math.min(size / srcWidth, size / srcHeight)
    const drawW = Math.round(srcWidth * scale)
    const drawH = Math.round(srcHeight * scale)
    const padX = (size - drawW) / 2
    const padY = (size - drawH) / 2

    ctx.fillStyle = PAD_COLOR
    ctx.fillRect(0, 0, size, size)
    ctx.drawImage(source, padX, padY, drawW, drawH)

    const { data } = ctx.getImageData(0, 0, size, size)
    const area = size * size
    for (let i = 0, p = 0; i < area; i++, p += 4) {
      buffer[i] = data[p]! / 255
      buffer[i + area] = data[p + 1]! / 255
      buffer[i + 2 * area] = data[p + 2]! / 255
    }

    const info: LetterboxInfo = { scale, padX, padY }
    return { data: buffer, info }
  }
}
