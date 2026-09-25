<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { InputPreview } from '@/types/image'

/**
 * Muestra la imagen EXACTA que recibió el modelo en el último frame (tras letterbox y filtros),
 * recortando el relleno gris. Se superpone al <video> con el mismo tamaño, así las cajas coinciden.
 */
const props = defineProps<{
  getSource: () => InputPreview | null
  /** Cambia en cada frame procesado. */
  frameKey: number
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

function render() {
  const src = props.getSource()
  const el = canvas.value
  if (!src || !el || !ctx) return
  if (el.width !== src.width || el.height !== src.height) {
    el.width = src.width
    el.height = src.height
  }
  ctx.drawImage(src.canvas, src.x, src.y, src.width, src.height, 0, 0, src.width, src.height)
}

onMounted(() => {
  ctx = canvas.value?.getContext('2d') ?? null
  render()
})

watch(() => props.frameKey, render)
</script>

<template>
  <canvas ref="canvas" class="filtered-preview" />
</template>

<style scoped>
.filtered-preview {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: #000;
  image-rendering: auto;
}
</style>
