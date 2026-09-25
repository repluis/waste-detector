import { onBeforeUnmount, ref, type Ref } from 'vue'
import type { Detector } from '@/services/detector'
import { toWasteDetections } from '@/services/waste/waste-classifier'
import { useDetectionStore } from '@/stores/detection.store'

/**
 * Bucle de inferencia: toma el frame actual del <video>, detecta, filtra solo residuos
 * y publica en el store. Nunca encola frames: si la inferencia tarda, se saltan frames.
 */
export function useDetectionLoop(video: Ref<HTMLVideoElement | null>) {
  const store = useDetectionStore()
  const isRunning = ref(false)
  let frameId = 0
  let detector: Detector | null = null

  async function tick() {
    if (!isRunning.value || !detector) return
    const el = video.value
    if (el && el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && el.videoWidth > 0) {
      try {
        const { detections, inferenceMs } = await detector.detect(el, el.videoWidth, el.videoHeight)
        if (isRunning.value) store.pushFrame(toWasteDetections(detections), inferenceMs)
      } catch (err) {
        console.error('[detection-loop]', err)
      }
    }
    if (isRunning.value) frameId = requestAnimationFrame(tick)
  }

  function start(instance: Detector) {
    if (isRunning.value) return
    detector = instance
    isRunning.value = true
    frameId = requestAnimationFrame(tick)
  }

  function stop() {
    isRunning.value = false
    cancelAnimationFrame(frameId)
    store.resetFrame()
  }

  onBeforeUnmount(stop)

  return { isRunning, start, stop }
}
