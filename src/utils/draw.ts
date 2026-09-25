import type { WasteDetection } from '@/types/detection'

export function drawDetections(ctx: CanvasRenderingContext2D, detections: WasteDetection[]): void {
  const { width, height } = ctx.canvas
  ctx.clearRect(0, 0, width, height)

  // Grosor y fuente proporcionales a la resolución del video.
  const unit = Math.max(width, height) / 400
  const lineWidth = Math.max(2, unit)
  const fontSize = Math.max(14, unit * 6)
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`
  ctx.textBaseline = 'top'

  for (const d of detections) {
    const { x, y, width: w, height: h } = d.box
    const color = d.category.color

    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.strokeRect(x, y, w, h)

    const text = `${d.category.name} ${(d.score * 100).toFixed(1)}%`
    const pad = fontSize * 0.3
    const labelW = ctx.measureText(text).width + pad * 2
    const labelH = fontSize + pad * 2
    const labelY = y - labelH >= 0 ? y - labelH : y

    ctx.fillStyle = color
    ctx.fillRect(x, labelY, labelW, labelH)
    ctx.fillStyle = '#0b0f14'
    ctx.fillText(text, x + pad, labelY + pad)
  }
}
