<script setup lang="ts">
import { SlidersHorizontal } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { FILTER_PRESETS } from '@/config/filter-presets'
import { FILTERS, type ModelImpact } from '@/services/image/filters'
import { useImageSettingsStore } from '@/stores/image-settings.store'

const settings = useImageSettingsStore()
const { filters, activePresetId, enabledFilters } = storeToRefs(settings)

const IMPACT_LABEL: Record<ModelImpact, string> = {
  positive: 'Suele mejorar',
  neutral: 'Depende',
  negative: 'Suele empeorar',
}

function onSlider(id: (typeof FILTERS)[number]['id'], event: Event) {
  settings.setValue(id, Number((event.target as HTMLInputElement).value))
}
</script>

<template>
  <details class="panel" open>
    <summary>
      <SlidersHorizontal :size="18" />
      Filtros de imagen
      <span class="summary-hint">
        {{ enabledFilters.length ? `${enabledFilters.length} activo(s)` : 'ninguno' }}
      </span>
    </summary>

    <p class="intro">
      Se aplican al frame <strong>antes</strong> de enviarlo al modelo, así que cambian lo que detecta.
      Usa la vista <em>"Lo que ve el modelo"</em> para ver el resultado.
    </p>

    <div class="presets" role="radiogroup" aria-label="Ajustes predefinidos">
      <button
        v-for="p in FILTER_PRESETS"
        :key="p.id"
        role="radio"
        :aria-checked="activePresetId === p.id"
        :class="{ active: activePresetId === p.id }"
        :title="p.description"
        @click="settings.applyPreset(p.id)"
      >
        {{ p.name }}
      </button>
      <span v-if="!activePresetId" class="custom">Personalizado</span>
    </div>

    <ul class="filters">
      <li v-for="f in FILTERS" :key="f.id" :class="{ enabled: filters[f.id].enabled }">
        <label class="head">
          <input type="checkbox" :checked="filters[f.id].enabled" @change="settings.toggle(f.id)" />
          <span class="name">{{ f.name }}</span>
          <span class="impact" :class="f.modelImpact">{{ IMPACT_LABEL[f.modelImpact] }}</span>
        </label>

        <div v-if="f.param && filters[f.id].enabled" class="param">
          <input
            type="range"
            :min="f.param.min"
            :max="f.param.max"
            :step="f.param.step"
            :value="filters[f.id].value"
            :aria-label="`Intensidad de ${f.name}`"
            @input="onSlider(f.id, $event)"
          />
          <output>{{ f.param.format(filters[f.id].value) }}</output>
        </div>

        <p class="desc">{{ f.description }}</p>
        <p class="when"><strong>Cuándo usarlo:</strong> {{ f.whenToUse }}</p>
      </li>
    </ul>
  </details>
</template>

<style scoped>
.panel {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 0 1rem;
}

summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 0;
  font-weight: 700;
  cursor: pointer;
  list-style: none;
}

summary::-webkit-details-marker {
  display: none;
}

.summary-hint {
  margin-left: auto;
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 500;
}

.intro {
  margin: 0 0 0.875rem;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.presets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.presets button {
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
}

.presets button.active {
  border-color: var(--primary);
  background: rgb(34 197 94 / 0.15);
  color: var(--primary);
}

.custom {
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-style: italic;
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.625rem;
  margin: 0 0 1rem;
  padding: 0;
  list-style: none;
}

.filters li {
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 4px);
  transition: border-color 0.15s;
}

.filters li.enabled {
  border-color: var(--primary);
}

.head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.head input {
  accent-color: var(--primary);
}

.name {
  font-weight: 600;
}

.impact {
  margin-left: auto;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  white-space: nowrap;
}

.impact.positive { background: rgb(34 197 94 / 0.15); color: #4ade80; }
.impact.neutral { background: rgb(148 163 184 / 0.15); color: #cbd5e1; }
.impact.negative { background: rgb(239 68 68 / 0.15); color: #fca5a5; }

.param {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-top: 0.5rem;
}

.param input {
  flex: 1;
  accent-color: var(--primary);
}

.param output {
  min-width: 3.5rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-size: 0.8125rem;
}

.desc,
.when {
  margin: 0.375rem 0 0;
  color: var(--text-muted);
  font-size: 0.8125rem;
}
</style>
