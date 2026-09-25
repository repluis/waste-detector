import { onBeforeUnmount, ref, type Ref } from 'vue'
import { ErrorCode, InferenceError, toAppError } from '@/core/errors'
import { createLogger } from '@/core/logger'
import type { Detector } from '@/services/detector'
import { toWasteDetections } from '@/services/waste/waste-classifier'
import { useDetectionStore } from '@/stores/detection.store'

const log = createLogger('loop')

/** Tras N fallos seguidos se detiene el bucle (evita inundar la consola a 60 errores/s). */
const MAX_CONSECUTIVE_FAILURES = 5
const PERF_LOG_INTERVAL_MS = 5000

/**
 * Bucle de inferencia: toma el frame actual del <video>, detecta, filtra solo residuos
 * y publica en el store. Nunca encola frames: si la inferencia tarda, se saltan frames.
 */
export function useDetectionLoop(video: Ref<HTMLVideoElement | null>) {
  const store = useDetectionStore()
  const isRunning = ref(false)
  let frameId = 0
  let detector: Detector | null = null
  let failures = 0
  let lastPerfLog = 0

  async function tick() {
    if (!isRunning.value || !detector) return
    const el = video.value
    if (el && el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && el.videoWidth > 0) {
      try {
        const { detections, inferenceMs } = await detector.detect(el, el.videoWidth, el.videoHeight)
        if (isRunning.value) store.pushFrame(toWasteDetections(detections), inferenceMs)
        failures = 0
      } catch (err) {
        if (handleFailure(err)) return
      }
      logPerformance()
    }
    if (isRunning.value) frameId = requestAnimationFrame(tick)
  }

  /** Devuelve true si el bucle se detuvo. */
  function handleFailure(err: unknown): boolean {
    failures++
    const appError = toAppError(err, ErrorCode.INFERENCE_FAILED)
    if (failures === 1) log.error('Fallo en la inferencia', appError)
    if (failures < MAX_CONSECUTIVE_FAILURES) return false

    const fatal = new InferenceError({
      code: ErrorCode.INFERENCE_REPEATED_FAILURES,
      message: `${failures} fallos consecutivos; bucle detenido`,
      context: { failures, lastErrorCode: appError.code },
      cause: appError,
    })
    log.error('Bucle de detección detenido', fatal)
    stop()
    store.runtimeError = fatal
    return true
  }

  function logPerformance() {
    const now = performance.now()
    if (now - lastPerfLog < PERF_LOG_INTERVAL_MS) return
    lastPerfLog = now
    log.debug('Rendimiento', {
      fps: +store.fps.toFixed(1),
      inferenciaMs: +store.inferenceMs.toFixed(1),
      residuos: store.detections.map((d) => `${d.category.id} ${(d.score * 100).toFixed(0)}%`),
    })
  }

  function start(instance: Detector) {
    if (isRunning.value) return
    detector = instance
    failures = 0
    store.runtimeError = null
    isRunning.value = true
    log.info('Bucle de detección iniciado')
    frameId = requestAnimationFrame(tick)
  }

  function stop() {
    if (!isRunning.value) return
    isRunning.value = false
    cancelAnimationFrame(frameId)
    store.resetFrame()
    log.info('Bucle de detección detenido')
  }

  onBeforeUnmount(stop)

  return { isRunning, start, stop }
}
