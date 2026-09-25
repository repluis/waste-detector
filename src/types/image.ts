export type FilterId =
  | 'denoise'
  | 'autoLevels'
  | 'equalize'
  | 'brightness'
  | 'contrast'
  | 'gamma'
  | 'saturation'
  | 'sharpen'
  | 'grayscale'

export interface FilterSetting {
  enabled: boolean
  /** Intensidad; se ignora en filtros sin parámetro. */
  value: number
}

export type FilterSettings = Record<FilterId, FilterSetting>

/** 'normal' = video de la cámara; 'filtered' = la imagen exacta que recibe el modelo. */
export type ViewMode = 'normal' | 'filtered'

/** Región del canvas de preprocesado que contiene el frame (sin el relleno del letterbox). */
export interface InputPreview {
  canvas: HTMLCanvasElement
  x: number
  y: number
  width: number
  height: number
}

/** Qué se le hizo al frame antes de entrar al modelo (para mostrarlo en la UI). */
export interface InputInfo {
  sourceWidth: number
  sourceHeight: number
  contentWidth: number
  contentHeight: number
  padX: number
  padY: number
  tensorSize: number
  activeFilters: FilterId[]
  filtersMs: number
}
