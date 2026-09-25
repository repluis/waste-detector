import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { ErrorCode, toAppError, type AppError } from '@/core/errors'
import { createLogger } from '@/core/logger'
import { closeCamera, openCamera, type FacingMode } from '@/services/camera/camera.service'

const log = createLogger('camera')

export function useCamera(initialFacing: FacingMode = 'environment') {
  const stream = shallowRef<MediaStream | null>(null)
  const facingMode = ref<FacingMode>(initialFacing)
  const isStarting = ref(false)
  const error = shallowRef<AppError | null>(null)

  async function start() {
    stop()
    isStarting.value = true
    error.value = null
    try {
      stream.value = await openCamera({ facingMode: facingMode.value })
    } catch (err) {
      error.value = toAppError(err, ErrorCode.CAMERA_UNKNOWN)
      log.error('No se pudo abrir la cámara', error.value)
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
    log.debug(`Cambiando a cámara ${facingMode.value === 'user' ? 'frontal' : 'trasera'}`)
    if (stream.value) await start()
  }

  onBeforeUnmount(stop)

  return {
    stream,
    facingMode: computed(() => facingMode.value),
    isStarting: computed(() => isStarting.value),
    error: computed(() => error.value),
    start,
    stop,
    toggleFacing,
  }
}
