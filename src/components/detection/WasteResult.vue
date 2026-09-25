<script setup lang="ts">
import { Recycle } from 'lucide-vue-next'
import type { WasteDetection } from '@/types/detection'

defineProps<{
  detection: WasteDetection | null
}>()
</script>

<template>
  <div class="result" :style="detection ? { '--accent': detection.category.color } : undefined">
    <template v-if="detection">
      <Recycle class="icon" :size="32" />
      <div>
        <p class="category">{{ detection.category.name }} — {{ (detection.score * 100).toFixed(1) }}%</p>
        <p class="bin">{{ detection.category.bin }}</p>
      </div>
    </template>
    <p v-else class="empty">Apunta la cámara a un residuo…</p>
  </div>
</template>

<style scoped>
.result {
  --accent: var(--border);
  display: flex;
  align-items: center;
  gap: 0.875rem;
  min-height: 4.5rem;
  padding: 0.875rem 1rem;
  border: 2px solid var(--accent);
  border-radius: var(--radius);
  background: var(--surface);
}

.icon {
  color: var(--accent);
  flex-shrink: 0;
}

.category {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.bin {
  margin: 0.125rem 0 0;
  color: var(--text-muted);
}

.empty {
  margin: 0;
  color: var(--text-muted);
}
</style>
