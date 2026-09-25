<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  stream: MediaStream | null
}>()

const emit = defineEmits<{
  ready: [video: HTMLVideoElement]
}>()

const video = ref<HTMLVideoElement | null>(null)

watch(
  [() => props.stream, video],
  ([stream, el]) => {
    if (el) el.srcObject = stream
  },
  { immediate: true },
)

function onLoadedMetadata() {
  if (video.value) emit('ready', video.value)
}
</script>

<template>
  <div class="camera">
    <video ref="video" autoplay muted playsinline @loadedmetadata="onLoadedMetadata" />
    <!-- Capa superpuesta (canvas de detecciones) -->
    <slot />
  </div>
</template>

<style scoped>
.camera {
  position: relative;
  width: 100%;
  background: #000;
  border-radius: var(--radius);
  overflow: hidden;
  line-height: 0;
}

video {
  width: 100%;
  height: auto;
  display: block;
}
</style>
