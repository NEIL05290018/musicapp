<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { albumCoverCount } from '@/data/albumCatalog'

const route = useRoute()
const columns = [9, 8, 6, 5].find(count => albumCoverCount % count === 0) || 6
const tileWidth = columns * 224
const tileHeight = Math.ceil(albumCoverCount / columns) * 224
const texture = ref('')
let disposed = false
async function createTexture() {
  const covers = await Promise.all(Array.from({ length: albumCoverCount }, (_, i) => new Promise<HTMLImageElement | null>(resolve => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = '/albums/album-' + (i + 1) + '.jpg'
  })))
  if (disposed) return
  const canvas = document.createElement('canvas')
  canvas.width = tileWidth
  canvas.height = tileHeight
  const context = canvas.getContext('2d')
  if (!context) return
  covers.forEach((image, index) => {
    if (!image) return
    const x = (index % columns) * 224
    const y = Math.floor(index / columns) * 224
    const side = Math.min(image.naturalWidth, image.naturalHeight)
    context.save()
    context.beginPath()
    context.roundRect(x, y, 200, 200, 12)
    context.clip()
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, x, y, 200, 200)
    context.restore()
  })
  texture.value = canvas.toDataURL('image/webp', .9)
}
onMounted(createTexture)
onUnmounted(() => { disposed = true })
</script>

<template>
  <div class="album-wall pointer-events-none fixed inset-0 z-0 hidden overflow-hidden md:block" :style="{ '--wall-width': tileWidth + 'px', '--wall-height': tileHeight + 'px' }" aria-hidden="true">
    <div v-if="texture" class="album-wall-tiles" :style="{ backgroundImage: 'url(' + texture + ')' }" />
  </div>
  <div class="album-wall-shade pointer-events-none fixed inset-0 z-[1]" :class="{ 'album-wall-shade-workbench': route.path === '/' }" aria-hidden="true" />
</template>

<style scoped>
.album-wall-tiles {
  position: absolute;
  inset: 0 auto auto 0;
  width: calc(100% + var(--wall-width));
  height: calc(100% + var(--wall-height));
  background-repeat: repeat;
  background-size: var(--wall-width) var(--wall-height);
  will-change: transform;
  animation: album-wall-drift 48s linear infinite;
}
.album-wall-shade { background: rgba(8, 8, 12, .85); backdrop-filter: blur(12px); }
.album-wall-shade-workbench { background: rgba(8, 8, 12, .50); backdrop-filter: blur(2px); }
@keyframes album-wall-drift {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(calc(-1 * var(--wall-width)), calc(-1 * var(--wall-height)), 0); }
}
@media (prefers-reduced-motion: reduce) {
  .album-wall-tiles { animation: none; }
}
@media (prefers-reduced-transparency: reduce) {
  .album-wall-shade { background: rgba(8, 8, 12, .92); backdrop-filter: none; }
}
</style>
