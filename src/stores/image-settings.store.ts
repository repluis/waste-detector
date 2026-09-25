import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { FILTER_PRESETS } from '@/config/filter-presets'
import { createLogger } from '@/core/logger'
import { defaultFilterSettings, enabledFilterIds, FILTERS, FILTERS_BY_ID } from '@/services/image/filters'
import type { FilterId, FilterSettings, ViewMode } from '@/types/image'

const STORAGE_KEY = 'wv:image-settings'
const log = createLogger('filters')

interface PersistedSettings {
  filters: FilterSettings
  viewMode: ViewMode
}

function load(): PersistedSettings {
  const defaults: PersistedSettings = { filters: defaultFilterSettings(), viewMode: 'normal' }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const saved = JSON.parse(raw) as Partial<PersistedSettings>
    // Se fusiona con los valores por defecto: tolera filtros añadidos o eliminados entre versiones.
    for (const f of FILTERS) {
      const s = saved.filters?.[f.id]
      if (s && typeof s.enabled === 'boolean' && typeof s.value === 'number') defaults.filters[f.id] = s
    }
    if (saved.viewMode === 'filtered' || saved.viewMode === 'normal') defaults.viewMode = saved.viewMode
  } catch {
    // almacenamiento no disponible o JSON corrupto: se usan los valores por defecto
  }
  return defaults
}

export const useImageSettingsStore = defineStore('imageSettings', () => {
  const initial = load()
  const filters = ref<FilterSettings>(initial.filters)
  const viewMode = ref<ViewMode>(initial.viewMode)

  const enabledFilters = computed(() => enabledFilterIds(filters.value).map((id) => FILTERS_BY_ID[id]))

  /** Preset que coincide exactamente con la configuración actual (o null si es personalizada). */
  const activePresetId = computed(() => {
    const current = filters.value
    const match = FILTER_PRESETS.find((preset) =>
      FILTERS.every((f) => {
        const wanted = preset.filters[f.id]
        const s = current[f.id]
        if (wanted === undefined) return !s.enabled
        const value = wanted === true ? (f.param?.default ?? 0) : wanted
        return s.enabled && (!f.param || Math.abs(s.value - value) < 1e-6)
      }),
    )
    return match?.id ?? null
  })

  function toggle(id: FilterId) {
    filters.value[id].enabled = !filters.value[id].enabled
  }

  function setValue(id: FilterId, value: number) {
    filters.value[id].value = value
  }

  function applyPreset(presetId: string) {
    const preset = FILTER_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    const next = defaultFilterSettings()
    for (const [id, wanted] of Object.entries(preset.filters) as [FilterId, true | number][]) {
      next[id].enabled = true
      if (typeof wanted === 'number') next[id].value = wanted
    }
    filters.value = next
  }

  function toggleViewMode() {
    viewMode.value = viewMode.value === 'normal' ? 'filtered' : 'normal'
  }

  watch(
    [filters, viewMode],
    () => {
      log.debug('Preprocesado actualizado', {
        vista: viewMode.value,
        filtros: enabledFilters.value.map((f) => (f.param ? `${f.id}=${filters.value[f.id].value}` : f.id)),
      })
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ filters: filters.value, viewMode: viewMode.value }))
      } catch {
        // sin persistencia: la configuración se pierde al recargar
      }
    },
    { deep: true },
  )

  return { filters, viewMode, enabledFilters, activePresetId, toggle, setValue, applyPreset, toggleViewMode }
})
