import type { BoundingBox } from '@/types/detection'

export interface ScoredBox {
  classId: number
  score: number
  box: BoundingBox
}

export function iou(a: BoundingBox, b: BoundingBox): number {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.width, b.x + b.width)
  const y2 = Math.min(a.y + a.height, b.y + b.height)
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const union = a.width * a.height + b.width * b.height - inter
  return union > 0 ? inter / union : 0
}

/** Non-Maximum Suppression por clase. */
export function nms<T extends ScoredBox>(boxes: T[], iouThreshold: number, maxDetections: number): T[] {
  const sorted = [...boxes].sort((a, b) => b.score - a.score)
  const kept: T[] = []
  for (const candidate of sorted) {
    if (kept.length >= maxDetections) break
    const overlaps = kept.some(
      (k) => k.classId === candidate.classId && iou(k.box, candidate.box) > iouThreshold,
    )
    if (!overlaps) kept.push(candidate)
  }
  return kept
}
