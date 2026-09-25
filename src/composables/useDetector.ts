import { storeToRefs } from 'pinia'
import { ErrorCode, toAppError } from '@/core/errors'
import { createLogger } from '@/core/logger'
import { createDetector, type Detector } from '@/services/detector'
import { useDetectionStore } from '@/stores/detection.store'

const log = createLogger('detector')

// Singleton: el modelo se descarga y compila una sola vez por sesión.
let detector: Detector | null = null
let loading: Promise<Detector> | null = null

export function useDetector() {
  const store = useDetectionStore()
  const { modelStatus, modelError, backend } = storeToRefs(store)

  function load(): Promise<Detector> {
    if (detector) return Promise.resolve(detector)
    if (loading) return loading

    modelStatus.value = 'loading'
    modelError.value = null
    const instance = createDetector()
    const done = log.time('Carga total del detector')

    loading = instance
      .load()
      .then((b) => {
        done()
        backend.value = b
        modelStatus.value = 'ready'
        detector = instance
        return instance
      })
      .catch((err) => {
        const appError = toAppError(err, ErrorCode.MODEL_LOAD_FAILED)
        modelStatus.value = 'error'
        modelError.value = appError
        log.error('No se pudo cargar el modelo', appError)
        throw appError
      })
      .finally(() => {
        loading = null
      })

    return loading
  }

  return { load, modelStatus, modelError, backend }
}
