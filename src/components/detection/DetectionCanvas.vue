<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { WasteDetection } from '@/types/detection'
import { drawDetections } from '@/utils/draw'

/** Canvas del mismo tamaño intrínseco que el video: las cajas se dibujan en píxeles del frame. */
const props = defineProps<{
  detections: WasteDetection[]
  width: number
  height: number
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

function render() {
  if (ctx) drawDetections(ctx, props.detections)
}

onMounted(() => {
  ctx = canvas.value?.getContext('2d') ?? null
  render()
})

watch(() => props.detections, render)
watch(
  () => [props.width, props.height],
  () => requestAnimationFrame(render),
)
</script>

<template>
  <canvas ref="canvas" :width="width" :height="height" />
</template>

<style scoped>
canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
