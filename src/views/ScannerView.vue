<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { CircleStop, Play, SwitchCamera } from 'lucide-vue-next'
import { computed, reactive, shallowRef } from 'vue'
import CameraView from '@/components/camera/CameraView.vue'
import DetectionCanvas from '@/components/detection/DetectionCanvas.vue'
import DetectorStatus from '@/components/detection/DetectorStatus.vue'
import WasteResult from '@/components/detection/WasteResult.vue'
import { useCamera } from '@/composables/useCamera'
import { useDetectionLoop } from '@/composables/useDetectionLoop'
import { useDetector } from '@/composables/useDetector'
import { useDetectionStore } from '@/stores/detection.store'

const video = shallowRef<HTMLVideoElement | null>(null)
const frameSize = reactive({ width: 0, height: 0 })

const camera = useCamera()
const detector = useDetector()
const loop = useDetectionLoop(video)
const { detections, primaryDetection, fps, inferenceMs, runtimeError } = storeToRefs(useDetectionStore())

const error = computed(() => camera.error.value ?? detector.modelError.value ?? runtimeError.value)
const isActive = computed(() => !!camera.stream.value)

async function startScanning() {
  // Cámara y modelo en paralelo: el usuario ve el video mientras el modelo compila.
  const [instance] = await Promise.all([detector.load().catch(() => null), camera.start()])
  if (instance && camera.stream.value) loop.start(instance)
}

function stopScanning() {
  loop.stop()
  camera.stop()
}

// Se dispara en cada loadedmetadata (también al cambiar de cámara) con las dimensiones reales.
function onVideoReady(el: HTMLVideoElement) {
  video.value = el
  frameSize.width = el.videoWidth
  frameSize.height = el.videoHeight
}
</script>

<template>
  <section class="scanner">
    <DetectorStatus
      :status="detector.modelStatus.value"
      :backend="detector.backend.value"
      :fps="fps"
      :inference-ms="inferenceMs"
    />

    <CameraView
      v-show="isActive"
      :stream="camera.stream.value"
      @ready="onVideoReady"
    >
      <DetectionCanvas :detections="detections" :width="frameSize.width" :height="frameSize.height" />
    </CameraView>

    <div v-if="!isActive" class="placeholder">
      La cámara está apagada
    </div>

    <div v-if="error" class="error" role="alert">
      <p>{{ error.userMessage }}</p>
      <small>Código: <code>{{ error.code }}</code> · detalles en la consola del navegador (F12)</small>
    </div>

    <WasteResult v-if="isActive" :detection="primaryDetection" />

    <div class="actions">
      <button v-if="!isActive" class="btn btn-primary" :disabled="camera.isStarting.value" @click="startScanning">
        <Play :size="18" /> Iniciar detección
      </button>
      <template v-else>
        <button class="btn" @click="camera.toggleFacing">
          <SwitchCamera :size="18" /> Cambiar cámara
        </button>
        <button class="btn btn-danger" @click="stopScanning">
          <CircleStop :size="18" /> Detener
        </button>
      </template>
    </div>
  </section>
</template>

<style scoped>
.scanner {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem 0;
}

.placeholder {
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 9;
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
}

.error {
  margin: 0;
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  background: rgb(239 68 68 / 0.12);
  color: #fca5a5;
}

.error p {
  margin: 0;
  font-weight: 600;
}

.error small {
  opacity: 0.8;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
</style>
