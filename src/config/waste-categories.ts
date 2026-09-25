import type { WasteCategory, WasteCategoryId } from '@/types/detection'

export const WASTE_CATEGORIES: Record<WasteCategoryId, WasteCategory> = {
  plastic: { id: 'plastic', name: 'Plástico', color: '#facc15', bin: 'Contenedor amarillo' },
  paper: { id: 'paper', name: 'Papel', color: '#3b82f6', bin: 'Contenedor azul' },
  cardboard: { id: 'cardboard', name: 'Cartón', color: '#a16207', bin: 'Contenedor azul' },
  glass: { id: 'glass', name: 'Vidrio', color: '#22c55e', bin: 'Contenedor verde' },
  metal: { id: 'metal', name: 'Metal', color: '#94a3b8', bin: 'Contenedor amarillo' },
  organic: { id: 'organic', name: 'Orgánico', color: '#b45309', bin: 'Contenedor marrón' },
  electronic: { id: 'electronic', name: 'Electrónico', color: '#ef4444', bin: 'Punto limpio' },
}

export const WASTE_CATEGORY_IDS = Object.keys(WASTE_CATEGORIES) as WasteCategoryId[]

/**
 * Traduce etiquetas del modelo a categorías de residuo.
 * Con el modelo COCO actual solo algunas clases tienen sentido como residuo;
 * el resto (personas, coches…) se ignora. Un modelo propio que ya emita
 * 'plastic', 'glass', etc. no necesita entradas aquí: se mapea directamente.
 */
export const LABEL_TO_CATEGORY: Record<string, WasteCategoryId> = {
  bottle: 'plastic',
  cup: 'plastic',
  'wine glass': 'glass',
  fork: 'metal',
  knife: 'metal',
  spoon: 'metal',
  book: 'paper',
  banana: 'organic',
  apple: 'organic',
  orange: 'organic',
  broccoli: 'organic',
  carrot: 'organic',
  sandwich: 'organic',
  'hot dog': 'organic',
  pizza: 'organic',
  donut: 'organic',
  cake: 'organic',
  // Solo residuos: objetos en uso (laptop, teclado, móvil…) no se mapean con el modelo COCO.
  // La categoría 'electronic' queda lista para el modelo propio entrenado con RAEE.
}
