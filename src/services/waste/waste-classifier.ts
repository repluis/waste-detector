import { LABEL_TO_CATEGORY, WASTE_CATEGORIES } from '@/config/waste-categories'
import type { RawDetection, WasteCategoryId, WasteDetection } from '@/types/detection'

function resolveCategory(label: string): WasteCategoryId | undefined {
  if (label in WASTE_CATEGORIES) return label as WasteCategoryId
  return LABEL_TO_CATEGORY[label]
}

/** Convierte detecciones genéricas del modelo en residuos; descarta lo que no es residuo. */
export function toWasteDetections(detections: RawDetection[]): WasteDetection[] {
  const result: WasteDetection[] = []
  for (const d of detections) {
    const id = resolveCategory(d.label)
    if (id) result.push({ ...d, category: WASTE_CATEGORIES[id] })
  }
  return result
}
