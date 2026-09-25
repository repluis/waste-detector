import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { ExecutionBackend, ModelStatus, WasteDetection } from '@/types/detection'

export const useDetectionStore = defineStore('detection', () => {
  const modelStatus = ref<ModelStatus>('idle')
  const modelError = ref<string | null>(null)
  const backend = ref<ExecutionBackend | null>(null)

  const detections = shallowRef<WasteDetection[]>([])
  const inferenceMs = ref(0)
  const fps = ref(0)

  /** Residuo con mayor confianza en el frame actual. */
  const primaryDetection = computed(() =>
    detections.value.reduce<WasteDetection | null>((best, d) => (!best || d.score > best.score ? d : best), null),
  )

  let lastFrameAt = 0

  function pushFrame(frame: WasteDetection[], ms: number) {
    detections.value = frame
    inferenceMs.value = ms
    const now = performance.now()
    if (lastFrameAt) {
      const instant = 1000 / (now - lastFrameAt)
      fps.value = fps.value ? fps.value * 0.9 + instant * 0.1 : instant // media móvil
    }
    lastFrameAt = now
  }

  function resetFrame() {
    detections.value = []
    fps.value = 0
    lastFrameAt = 0
  }

  return { modelStatus, modelError, backend, detections, inferenceMs, fps, primaryDetection, pushFrame, resetFrame }
})
