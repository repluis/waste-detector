import { storeToRefs } from 'pinia'
import { createDetector, type Detector } from '@/services/detector'
import { useDetectionStore } from '@/stores/detection.store'

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

    loading = instance
      .load()
      .then((b) => {
        backend.value = b
        modelStatus.value = 'ready'
        detector = instance
        return instance
      })
      .catch((err) => {
        modelStatus.value = 'error'
        modelError.value = err instanceof Error ? err.message : String(err)
        throw err
      })
      .finally(() => {
        loading = null
      })

    return loading
  }

  return { load, modelStatus, modelError, backend }
}
