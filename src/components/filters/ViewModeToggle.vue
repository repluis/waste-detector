<script setup lang="ts">
import { Cpu, Eye } from 'lucide-vue-next'
import type { ViewMode } from '@/types/image'

defineProps<{
  modelValue: ViewMode
  filterCount: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ViewMode]
}>()
</script>

<template>
  <div class="toggle" role="radiogroup" aria-label="Vista de la cámara">
    <button
      role="radio"
      :aria-checked="modelValue === 'normal'"
      :class="{ active: modelValue === 'normal' }"
      @click="emit('update:modelValue', 'normal')"
    >
      <Eye :size="16" /> Normal
    </button>
    <button
      role="radio"
      :aria-checked="modelValue === 'filtered'"
      :class="{ active: modelValue === 'filtered' }"
      @click="emit('update:modelValue', 'filtered')"
    >
      <Cpu :size="16" /> Lo que ve el modelo
      <span v-if="filterCount" class="badge">{{ filterCount }}</span>
    </button>
  </div>
</template>

<style scoped>
.toggle {
  display: inline-flex;
  align-self: flex-start;
  padding: 0.25rem;
  gap: 0.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

button {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4rem 0.75rem;
  border: 0;
  border-radius: calc(var(--radius) - 4px);
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

button.active {
  background: var(--primary);
  color: #04120a;
}

.badge {
  min-width: 1.25rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.25);
  font-size: 0.75rem;
  text-align: center;
}
</style>
