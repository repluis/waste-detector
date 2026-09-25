<script setup lang="ts">
import type { ExecutionBackend, ModelStatus } from '@/types/detection'

defineProps<{
  status: ModelStatus
  backend: ExecutionBackend | null
  fps: number
  inferenceMs: number
}>()

const STATUS_TEXT: Record<ModelStatus, string> = {
  idle: 'Modelo sin cargar',
  loading: 'Cargando modelo…',
  ready: 'Modelo listo',
  error: 'Error en el modelo',
}
</script>

<template>
  <div class="status">
    <span class="dot" :class="status" />
    <span>{{ STATUS_TEXT[status] }}</span>
    <template v-if="status === 'ready'">
      <span class="chip">{{ backend?.toUpperCase() }}</span>
      <span class="chip">{{ fps.toFixed(0) }} FPS</span>
      <span class="chip">{{ inferenceMs.toFixed(0) }} ms</span>
    </template>
  </div>
</template>

<style scoped>
.status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--text-muted);
}
.dot.loading { background: #facc15; }
.dot.ready { background: #22c55e; }
.dot.error { background: #ef4444; }

.chip {
  padding: 0.125rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
}
</style>
