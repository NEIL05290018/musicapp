<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const cols = 9
const rows = 7
const gap = 24
const cardSize = 200

const gridStyle = ref<Record<string, string>>({})

let animationFrame = 0
const offset = { x: 0, y: 0 }
const speed = 0.55

function getCoverUrl(index: number): string {
  return `/albums/album-${((index - 1) % 30) + 1}.jpg`
}

const grid: { row: number; col: number; index: number }[] = []
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    grid.push({ row: r, col: c, index: r * cols + c + 1 })
  }
}

const stepX = cardSize + gap
const stepY = cardSize + gap
const totalWidth = cols * stepX
const totalHeight = rows * stepY

function animate() {
  offset.x += speed * 0.5
  offset.y += speed * 0.35
  if (offset.x >= stepX) offset.x -= stepX
  if (offset.x <= -stepX) offset.x += stepX
  if (offset.y >= stepY) offset.y -= stepY
  if (offset.y <= -stepY) offset.y += stepY

  gridStyle.value = {
    '--ox': `${-offset.x}px`,
    '--oy': `${-offset.y}px`,
  }

  animationFrame = requestAnimationFrame(animate)
}

onMounted(() => { animate() })
onUnmounted(() => { cancelAnimationFrame(animationFrame) })
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden">
    <div
      class="absolute flex flex-wrap"
      :style="{
        left: '-10%',
        top: '-10%',
        width: '120vw',
        height: '120vh',
        transform: `translate(var(--ox), var(--oy))`,
        ...gridStyle,
      }"
    >
      <div
        v-for="item in grid"
        :key="`${item.row}-${item.col}`"
        class="shrink-0 rounded-xl bg-cover bg-center"
        :style="{
          width: cardSize + 'px',
          height: cardSize + 'px',
          marginRight: item.col < cols - 1 ? gap + 'px' : '0',
          marginBottom: item.row < rows - 1 ? gap + 'px' : '0',
          backgroundImage: `url(${getCoverUrl(item.index)})`,
        }"
      />
    </div>
  </div>
  <div class="pointer-events-none fixed inset-0 z-[1] backdrop-blur-[6px]" />
</template>
