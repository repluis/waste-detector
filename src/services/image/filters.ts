import type { FilterId, FilterSettings } from '@/types/image'

/**
 * Filtros de imagen aplicados al frame ANTES de la inferencia.
 * Operan en el sitio sobre ImageData (RGBA). Se ejecutan siempre en el orden de FILTERS,
 * que es el orden correcto de procesado: limpiar ruido → corregir exposición → color → nitidez.
 */

export type ModelImpact = 'positive' | 'neutral' | 'negative'

export interface FilterParam {
  min: number
  max: number
  step: number
  default: number
  format: (value: number) => string
}

export interface FilterDefinition {
  id: FilterId
  name: string
  description: string
  whenToUse: string
  /** Cómo suele afectar a la detección con un modelo entrenado en color. */
  modelImpact: ModelImpact
  param?: FilterParam
  apply: (img: ImageData, value: number) => void
}

// ─── utilidades ──────────────────────────────────────────────────────────────

const luma = (r: number, g: number, b: number) => (r * 77 + g * 150 + b * 29) >> 8
const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v)

function applyLut(data: Uint8ClampedArray, lut: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]!]!
    data[i + 1] = lut[data[i + 1]!]!
    data[i + 2] = lut[data[i + 2]!]!
  }
}

function buildLut(fn: (v: number) => number): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256)
  for (let i = 0; i < 256; i++) lut[i] = fn(i)
  return lut
}

function lumaHistogram(data: Uint8ClampedArray): Uint32Array {
  const hist = new Uint32Array(256)
  for (let i = 0; i < data.length; i += 4) hist[luma(data[i]!, data[i + 1]!, data[i + 2]!)]!++
  return hist
}

// Buffer reutilizado por los filtros de vecindad (evita ~1 MB de basura por frame).
let scratch = new Uint8ClampedArray(0)
function copyToScratch(data: Uint8ClampedArray): Uint8ClampedArray {
  if (scratch.length !== data.length) scratch = new Uint8ClampedArray(data.length)
  scratch.set(data)
  return scratch
}

/** Aplica un kernel 3×3 de pesos [centro, 4-vecinos, esquinas] (bordes sin tocar). */
function convolve3x3(img: ImageData, center: number, cross: number, corner: number) {
  const { data, width, height } = img
  const src = copyToScratch(data)
  const row = width * 4
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * row + x * 4
      for (let c = 0; c < 3; c++) {
        const p = i + c
        data[p] =
          src[p]! * center +
          (src[p - 4]! + src[p + 4]! + src[p - row]! + src[p + row]!) * cross +
          (src[p - row - 4]! + src[p - row + 4]! + src[p + row - 4]! + src[p + row + 4]!) * corner
      }
    }
  }
}

// ─── filtros ─────────────────────────────────────────────────────────────────

export const FILTERS: readonly FilterDefinition[] = [
  {
    id: 'denoise',
    name: 'Reducir ruido',
    description: 'Suavizado 3×3: promedia cada píxel con sus vecinos.',
    whenToUse: 'Poca luz: la cámara sube la ganancia y aparece "grano" que confunde al modelo.',
    modelImpact: 'neutral',
    apply: (img) => convolve3x3(img, 1 / 9, 1 / 9, 1 / 9),
  },
  {
    id: 'autoLevels',
    name: 'Niveles automáticos',
    description: 'Estira el histograma: el 1 % más oscuro pasa a negro y el 1 % más claro a blanco.',
    whenToUse: 'Imagen apagada, grisácea o con poca luz. Suele ser el filtro más útil.',
    modelImpact: 'positive',
    apply(img) {
      const hist = lumaHistogram(img.data)
      const total = img.width * img.height
      let low = 0
      let high = 255
      for (let acc = 0; low < 255 && (acc += hist[low]!) < total * 0.01; low++);
      for (let acc = 0; high > 0 && (acc += hist[high]!) < total * 0.01; high--);
      if (high - low < 16) return // imagen casi plana: estirar solo amplificaría ruido
      const k = 255 / (high - low)
      applyLut(img.data, buildLut((v) => (v - low) * k))
    },
  },
  {
    id: 'equalize',
    name: 'Ecualizar histograma',
    description: 'Redistribuye la luminancia para usar todo el rango tonal (conserva el tono de color).',
    whenToUse: 'Contraluz o escenas con zonas muy oscuras y muy claras a la vez.',
    modelImpact: 'neutral',
    apply(img) {
      const { data } = img
      const hist = lumaHistogram(data)
      const total = img.width * img.height
      const cdf = new Uint32Array(256)
      let acc = 0
      for (let i = 0; i < 256; i++) cdf[i] = acc += hist[i]!
      const cdfMin = cdf.find((v) => v > 0) ?? 0
      const range = total - cdfMin || 1
      const lut = buildLut((v) => ((cdf[v]! - cdfMin) / range) * 255)
      for (let i = 0; i < data.length; i += 4) {
        const y = luma(data[i]!, data[i + 1]!, data[i + 2]!)
        const ratio = y > 0 ? lut[y]! / y : 0
        data[i] = data[i]! * ratio
        data[i + 1] = data[i + 1]! * ratio
        data[i + 2] = data[i + 2]! * ratio
      }
    },
  },
  {
    id: 'brightness',
    name: 'Brillo',
    description: 'Suma o resta luz por igual a todos los píxeles.',
    whenToUse: 'Corrección manual rápida si la escena está oscura o quemada.',
    modelImpact: 'neutral',
    param: { min: -50, max: 50, step: 5, default: 20, format: (v) => `${v > 0 ? '+' : ''}${v} %` },
    apply(img, value) {
      const offset = value * 2.55
      applyLut(img.data, buildLut((v) => v + offset))
    },
  },
  {
    id: 'contrast',
    name: 'Contraste',
    description: 'Separa claros y oscuros alrededor del gris medio.',
    whenToUse: 'Objetos que se "funden" con el fondo (cartón sobre mesa de madera, bolsa sobre suelo claro).',
    modelImpact: 'positive',
    param: { min: 0.5, max: 2, step: 0.1, default: 1.3, format: (v) => `×${v.toFixed(1)}` },
    apply(img, value) {
      applyLut(img.data, buildLut((v) => (v - 128) * value + 128))
    },
  },
  {
    id: 'gamma',
    name: 'Gamma (sombras)',
    description: 'Curva no lineal: valores < 1 aclaran sombras sin quemar las luces.',
    whenToUse: 'Poca luz: recupera detalle en zonas oscuras mejor que el brillo.',
    modelImpact: 'positive',
    param: { min: 0.4, max: 2, step: 0.05, default: 0.7, format: (v) => v.toFixed(2) },
    apply(img, value) {
      applyLut(img.data, buildLut((v) => 255 * Math.pow(v / 255, value)))
    },
  },
  {
    id: 'saturation',
    name: 'Saturación',
    description: 'Intensifica (> 1) o apaga (< 1) los colores.',
    whenToUse: 'Luz cálida o fluorescente que "lava" los colores y dificulta distinguir materiales.',
    modelImpact: 'neutral',
    param: { min: 0, max: 2, step: 0.1, default: 1.4, format: (v) => `×${v.toFixed(1)}` },
    apply(img, value) {
      const { data } = img
      for (let i = 0; i < data.length; i += 4) {
        const y = luma(data[i]!, data[i + 1]!, data[i + 2]!)
        data[i] = clamp255(y + (data[i]! - y) * value)
        data[i + 1] = clamp255(y + (data[i + 1]! - y) * value)
        data[i + 2] = clamp255(y + (data[i + 2]! - y) * value)
      }
    },
  },
  {
    id: 'sharpen',
    name: 'Enfocar',
    description: 'Realza bordes y texturas (máscara de enfoque 3×3).',
    whenToUse: 'Cámara de baja calidad o imagen algo desenfocada. Combinado con "Reducir ruido" funciona mejor.',
    modelImpact: 'neutral',
    param: { min: 0.2, max: 2, step: 0.1, default: 0.8, format: (v) => v.toFixed(1) },
    apply: (img, value) => convolve3x3(img, 1 + 4 * value, -value, 0),
  },
  {
    id: 'grayscale',
    name: 'Escala de grises',
    description: 'Elimina el color y deja solo la luminancia.',
    whenToUse: 'Solo para inspeccionar forma y textura. El modelo se entrenó en color: suele empeorar la detección.',
    modelImpact: 'negative',
    apply(img) {
      const { data } = img
      for (let i = 0; i < data.length; i += 4) {
        data[i] = data[i + 1] = data[i + 2] = luma(data[i]!, data[i + 1]!, data[i + 2]!)
      }
    },
  },
]

export const FILTERS_BY_ID = Object.fromEntries(FILTERS.map((f) => [f.id, f])) as Record<FilterId, FilterDefinition>

export function defaultFilterSettings(): FilterSettings {
  return Object.fromEntries(
    FILTERS.map((f) => [f.id, { enabled: false, value: f.param?.default ?? 0 }]),
  ) as FilterSettings
}

export function enabledFilterIds(settings: FilterSettings): FilterId[] {
  return FILTERS.filter((f) => settings[f.id].enabled).map((f) => f.id)
}

/** Ejecuta los filtros activos en el orden canónico. */
export function applyFilters(img: ImageData, settings: FilterSettings): FilterId[] {
  const applied: FilterId[] = []
  for (const filter of FILTERS) {
    const setting = settings[filter.id]
    if (!setting.enabled) continue
    filter.apply(img, setting.value)
    applied.push(filter.id)
  }
  return applied
}
