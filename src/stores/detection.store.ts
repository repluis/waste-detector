import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { AppError } from '@/core/errors'
import type { ExecutionBackend, ModelStatus, WasteDetection } from '@/types/detection'
import type { InputInfo } from '@/types/image'

export const useDetectionStore = defineStore('detection', () => {
  const modelStatus = ref<ModelStatus>('idle')
  const modelError = shallowRef<AppError | null>(null)
  /** Error que detuvo el bucle de detección (fallos repetidos de inferencia). */
  const runtimeError = shallowRef<AppError | null>(null)
  const backend = ref<ExecutionBackend | null>(null)

  const detections = shallowRef<WasteDetection[]>([])
  const inferenceMs = ref(0)
  const fps = ref(0)
  /** Se incrementa en cada frame procesado (dispara el redibujado de la vista filtrada). */
  const frameCount = ref(0)
  /** Qué se le hizo al último frame antes de entrar al modelo. */
  const lastInput = shallowRef<InputInfo | null>(null)

  /** Residuo con mayor confianza en el frame actual. */
  const primaryDetection = computed(() =>
    detections.value.reduce<WasteDetection | null>((best, d) => (!best || d.score > best.score ? d : best), null),
  )

  let lastFrameAt = 0

  function pushFrame(frame: WasteDetection[], ms: number, input: InputInfo) {
    detections.value = frame
    inferenceMs.value = ms
    lastInput.value = input
    frameCount.value++
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

  return {
    modelStatus,
    modelError,
    runtimeError,
    backend,
    detections,
    inferenceMs,
    fps,
    frameCount,
    lastInput,
    primaryDetection,
    pushFrame,
    resetFrame,
  }
})
