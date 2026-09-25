import type { FilterId } from '@/types/image'

export interface FilterPreset {
  id: string
  name: string
  description: string
  /** Filtros activos; `true` = intensidad por defecto, número = intensidad concreta. */
  filters: Partial<Record<FilterId, true | number>>
}

export const FILTER_PRESETS: readonly FilterPreset[] = [
  { id: 'original', name: 'Original', description: 'Sin filtros: la imagen tal cual la da la cámara.', filters: {} },
  {
    id: 'low-light',
    name: 'Poca luz',
    description: 'Quita el grano, estira niveles y aclara sombras.',
    filters: { denoise: true, autoLevels: true, gamma: 0.75 },
  },
  {
    id: 'backlight',
    name: 'Contraluz',
    description: 'Ecualiza para ver objetos oscuros delante de una ventana o foco.',
    filters: { equalize: true, contrast: 1.1 },
  },
  {
    id: 'washed-out',
    name: 'Colores lavados',
    description: 'Recupera color y contraste bajo luz cálida o fluorescente.',
    filters: { autoLevels: true, saturation: 1.4, contrast: 1.2 },
  },
  {
    id: 'detail',
    name: 'Más detalle',
    description: 'Niveles automáticos y enfoque para resaltar bordes y texturas.',
    filters: { autoLevels: true, sharpen: true },
  },
  {
    id: 'grayscale',
    name: 'Escala de grises',
    description: 'Para inspeccionar forma y textura (reduce la precisión del modelo).',
    filters: { grayscale: true },
  },
]
