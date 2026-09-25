<script setup lang="ts">
import { Workflow } from 'lucide-vue-next'
import { computed } from 'vue'
import { FILTERS_BY_ID } from '@/services/image/filters'
import type { FilterSettings, InputInfo } from '@/types/image'

const props = defineProps<{
  input: InputInfo | null
  filters: FilterSettings
}>()

const activeFilters = computed(() =>
  (props.input?.activeFilters ?? []).map((id) => {
    const def = FILTERS_BY_ID[id]
    return { id, name: def.name, value: def.param ? def.param.format(props.filters[id].value) : null }
  }),
)
</script>

<template>
  <details class="panel">
    <summary><Workflow :size="18" /> ¿Qué se le hace a la imagen?</summary>

    <p v-if="!input" class="muted">Inicia la detección para ver los valores reales de cada paso.</p>

    <ol v-else class="steps">
      <li>
        <strong>Captura del frame</strong>
        <span>{{ input.sourceWidth }}×{{ input.sourceHeight }} px desde la cámara, en RGB.</span>
      </li>
      <li>
        <strong>Letterbox (redimensionado)</strong>
        <span>
          Se escala a {{ input.contentWidth }}×{{ input.contentHeight }} px manteniendo la proporción y se rellena con
          gris (114) hasta {{ input.tensorSize }}×{{ input.tensorSize }} px ({{ input.padX }} px a los lados,
          {{ input.padY }} px arriba/abajo). El modelo solo acepta imágenes cuadradas.
        </span>
      </li>
      <li :class="{ muted: !activeFilters.length }">
        <strong>Filtros de imagen</strong>
        <span v-if="!activeFilters.length">Ninguno (imagen original).</span>
        <span v-else>
          <template v-for="(f, i) in activeFilters" :key="f.id">
            {{ i ? ' → ' : '' }}{{ f.name }}<template v-if="f.value"> ({{ f.value }})</template>
          </template>
          · {{ input.filtersMs.toFixed(1) }} ms
        </span>
      </li>
      <li>
        <strong>Normalización</strong>
        <span>Cada canal R, G, B pasa de 0–255 a 0–1 (÷ 255). Sin restar medias: así se entrenó YOLO.</span>
      </li>
      <li>
        <strong>Tensor</strong>
        <span>
          Reordenado de píxeles (alto × ancho × canal) a planos por canal: tensor float32
          [1, 3, {{ input.tensorSize }}, {{ input.tensorSize }}].
        </span>
      </li>
      <li>
        <strong>Modelo → post-proceso</strong>
        <span>
          YOLO devuelve cajas + confianza; se descartan las de menos confianza, se deshace el letterbox para volver a
          coordenadas de la cámara y se eliminan las clases que no son residuos.
        </span>
      </li>
    </ol>
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

.steps {
  margin: 0 0 1rem;
  padding-left: 1.25rem;
  display: grid;
  gap: 0.625rem;
}

.steps li strong {
  display: block;
}

.steps li span,
.muted {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.muted {
  margin: 0 0 1rem;
}

li.muted {
  margin: 0;
  opacity: 0.7;
}
</style>
