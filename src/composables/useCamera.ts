import { onBeforeUnmount, readonly, ref, shallowRef } from 'vue'
import { closeCamera, openCamera, type FacingMode } from '@/services/camera/camera.service'

export function useCamera(initialFacing: FacingMode = 'environment') {
  const stream = shallowRef<MediaStream | null>(null)
  const facingMode = ref<FacingMode>(initialFacing)
  const isStarting = ref(false)
  const error = ref<string | null>(null)

  async function start() {
    stop()
    isStarting.value = true
    error.value = null
    try {
      stream.value = await openCamera({ facingMode: facingMode.value })
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      isStarting.value = false
    }
  }

  function stop() {
    closeCamera(stream.value)
    stream.value = null
  }

  async function toggleFacing() {
    facingMode.value = facingMode.value === 'environment' ? 'user' : 'environment'
    if (stream.value) await start()
  }

  onBeforeUnmount(stop)

  return {
    stream,
    facingMode: readonly(facingMode),
    isStarting: readonly(isStarting),
    error: readonly(error),
    start,
    stop,
    toggleFacing,
  }
}
