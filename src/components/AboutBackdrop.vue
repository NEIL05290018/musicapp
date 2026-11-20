<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// About uses the original cover collection independently of Discover's catalogue.
const aboutCoverCount = 30

const surface = ref<HTMLCanvasElement>()
const background = ref<HTMLCanvasElement>()
let frame = 0
let width = 0
let height = 0
let scale = 1
let previousTime = 0
let previousImage: HTMLCanvasElement | null = null
let image: HTMLImageElement | null = null
let cache: HTMLCanvasElement | null = null
let fadeStarted = 0
let cycleTimer: ReturnType<typeof setInterval> | undefined
let disposed = false
let imageIndex = 16
let bottomIndex = 1
let bottomImage: HTMLImageElement | null = null
let bottomCache: HTMLCanvasElement | null = null
let previousBottom: HTMLCanvasElement | null = null
let bottomFadeStarted = 0
let lastInteraction = 0
let enabled = false
let reveal = 0
const target = { x: 0, y: 0 }
const current = { x: 0, y: 0 }
const trail = Array.from({ length: 9 }, () => ({ x: 0, y: 0 }))
let motionQuery: MediaQueryList
let pointerQuery: MediaQueryList

function cacheImage() {
  if (!image || !width || !height) return
  const next = document.createElement('canvas')
  next.width = Math.ceil(width * scale)
  next.height = Math.ceil(height * scale)
  const context = next.getContext('2d')
  if (!context) return
  const fit = Math.max(next.width / image.naturalWidth, next.height / image.naturalHeight) * 1.06
  context.filter = 'brightness(.48) saturate(1.05)'
  context.drawImage(image, (next.width - image.naturalWidth * fit) / 2, (next.height - image.naturalHeight * fit) / 2, image.naturalWidth * fit, image.naturalHeight * fit)
  previousImage = cache
  cache = next
  fadeStarted = performance.now()
  if (!enabled) draw(performance.now(), 0)
}

function loadImage(index: number) {
  const next = new Image()
  next.onload = () => {
    if (disposed) return
    image = next
    cacheImage()
    if (surface.value) surface.value.dataset.wallpaper = next.src
  }
  next.src = '/albums/album-' + index + '.jpg'
}

function cacheBottomImage() {
  if (!bottomImage || !width || !height) return
  const next = document.createElement('canvas')
  next.width = Math.ceil(width * scale)
  next.height = Math.ceil(height * scale)
  const context = next.getContext('2d')
  if (!context) return
  const fit = Math.max(next.width / bottomImage.naturalWidth, next.height / bottomImage.naturalHeight) * 1.06
  context.filter = 'brightness(.70) saturate(1.15)'
  context.drawImage(bottomImage, (next.width - bottomImage.naturalWidth * fit) / 2, (next.height - bottomImage.naturalHeight * fit) / 2, bottomImage.naturalWidth * fit, bottomImage.naturalHeight * fit)
  previousBottom = bottomCache
  bottomCache = next
  bottomFadeStarted = performance.now()
  if (background.value) background.value.dataset.wallpaper = bottomImage.src
  if (!enabled) draw(performance.now(), 0)
}

function loadBottomImage(index: number) {
  const next = new Image()
  next.onload = () => {
    if (disposed) return
    bottomImage = next
    cacheBottomImage()
  }
  next.src = '/albums/album-' + index + '.jpg'
}

function resize() {
  width = window.innerWidth
  height = window.innerHeight
  // The photographic background needs fewer pixels than foreground text and controls.
  scale = Math.min(1, 1200 / width)
  if (surface.value) {
    surface.value.width = Math.ceil(width * scale)
    surface.value.height = Math.ceil(height * scale)
  }
  if (background.value) {
    background.value.width = Math.ceil(width * scale)
    background.value.height = Math.ceil(height * scale)
  }
  cacheImage()
  cacheBottomImage()
}

function pointerMove(event: PointerEvent) {
  if (!enabled || event.pointerType === 'touch') return
  if (!lastInteraction) {
    current.x = event.clientX
    current.y = event.clientY
    trail.forEach(point => { point.x = current.x; point.y = current.y })
  }
  target.x = event.clientX
  target.y = event.clientY
  lastInteraction = performance.now()
}

function pointerLeave() { lastInteraction = -10000 }

function draw(time: number, delta: number) {
  const canvas = surface.value
  const context = canvas?.getContext('2d')
  if (!context || !canvas || !cache) return
  const follow = 1 - Math.exp(-delta / 85)
  current.x += (target.x - current.x) * follow
  current.y += (target.y - current.y) * follow
  const active = enabled && time - lastInteraction < 1800 && lastInteraction > 0
  reveal += ((active ? 1 : 0) - reveal) * (1 - Math.exp(-delta / (active ? 140 : 420)))
  context.clearRect(0, 0, canvas.width, canvas.height)
  const x = (current.x - width / 2) * .012 * scale
  const y = (current.y - height / 2) * .012 * scale
  const mix = Math.min(1, (time - fadeStarted) / 900)
  if (previousImage && mix < 1) context.drawImage(previousImage, x - 18, y - 18, canvas.width + 36, canvas.height + 36)
  context.globalAlpha = previousImage ? mix : 1
  context.drawImage(cache, x - 18, y - 18, canvas.width + 36, canvas.height + 36)
  context.globalAlpha = 1
  if (mix >= 1) previousImage = null
  const underContext = background.value?.getContext('2d')
  if (underContext && bottomCache) {
    const mixBottom = Math.min(1, (time - bottomFadeStarted) / 900)
    const bx = (width / 2 - current.x) * .025 * scale
    const by = (height / 2 - current.y) * .025 * scale
    underContext.clearRect(0, 0, canvas.width, canvas.height)
    if (previousBottom && mixBottom < 1) underContext.drawImage(previousBottom, bx - 24, by - 24, canvas.width + 48, canvas.height + 48)
    underContext.globalAlpha = previousBottom ? mixBottom : 1
    underContext.drawImage(bottomCache, bx - 24, by - 24, canvas.width + 48, canvas.height + 48)
    underContext.globalAlpha = 1
    if (mixBottom >= 1) previousBottom = null
  }
  context.globalCompositeOperation = 'destination-out'
  let leader = current
  const radius = Math.min(380, Math.max(190, width * .25)) * scale
  for (let i = 0; i < trail.length; i++) {
    const point = trail[i]
    const ease = 1 - Math.exp(-delta / (55 + i * 14))
    point.x += (leader.x - point.x) * ease
    point.y += (leader.y - point.y) * ease
    const dx = leader.x - point.x
    const dy = leader.y - point.y
    const stretch = Math.min(.65, Math.hypot(dx, dy) / 180)
    const r = radius * (1 - i * .065)
    context.save()
    context.translate(point.x * scale, point.y * scale)
    context.rotate(Math.atan2(dy, dx))
    context.scale(1 + stretch, 1 - stretch * .25)
    const gradient = context.createRadialGradient(0, 0, r * .35, 0, 0, r)
    gradient.addColorStop(0, 'rgba(0,0,0,' + (reveal * (i === 0 ? 1 : .38)) + ')')
    gradient.addColorStop(.65, 'rgba(0,0,0,' + (reveal * .15) + ')')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    context.fillStyle = gradient
    context.fillRect(-r, -r, r * 2, r * 2)
    context.restore()
    leader = point
  }
  context.globalCompositeOperation = 'source-over'
}

function tick(time: number) {
  const delta = Math.min(50, previousTime ? time - previousTime : 16.67)
  previousTime = time
  draw(time, delta)
  frame = requestAnimationFrame(tick)
}
function updateMotion() {
  enabled = !motionQuery.matches && pointerQuery.matches
  cancelAnimationFrame(frame)
  previousTime = 0
  if (cycleTimer) clearInterval(cycleTimer)
  if (enabled && !document.hidden) {
    frame = requestAnimationFrame(tick)
    cycleTimer = setInterval(() => {
      imageIndex = (imageIndex + 4) % aboutCoverCount + 1
      bottomIndex = (bottomIndex + 6) % aboutCoverCount + 1
      if (bottomIndex === imageIndex) bottomIndex = bottomIndex % aboutCoverCount + 1
      loadImage(imageIndex)
      loadBottomImage(bottomIndex)
    }, 4000)
  } else {
    reveal = 0
    draw(performance.now(), 0)
  }
}

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  pointerQuery = window.matchMedia('(pointer: fine)')
  current.x = target.x = window.innerWidth / 2
  current.y = target.y = window.innerHeight / 2
  trail.forEach(point => { point.x = current.x; point.y = current.y })
  resize()
  loadImage(imageIndex)
  loadBottomImage(bottomIndex)
  updateMotion()
  motionQuery.addEventListener('change', updateMotion)
  pointerQuery.addEventListener('change', updateMotion)
  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', pointerMove, { passive: true })
  document.documentElement.addEventListener('pointerleave', pointerLeave)
  document.addEventListener('visibilitychange', updateMotion)
})
onUnmounted(() => {
  disposed = true
  cancelAnimationFrame(frame)
  if (cycleTimer) clearInterval(cycleTimer)
  motionQuery.removeEventListener('change', updateMotion)
  pointerQuery.removeEventListener('change', updateMotion)
  window.removeEventListener('resize', resize)
  window.removeEventListener('pointermove', pointerMove)
  document.documentElement.removeEventListener('pointerleave', pointerLeave)
  document.removeEventListener('visibilitychange', updateMotion)
})
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
    <canvas ref="background" class="about-wallpaper-bottom absolute inset-0 h-full w-full" />
    <canvas ref="surface" class="about-wallpaper-top absolute inset-0 h-full w-full" />
  </div>
</template>
