<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { MicVocal, Music2, Waves } from 'lucide-vue-next'
import { t } from '@/i18n'

const mouseX = ref(0)
const mouseY = ref(0)
const halfW = ref(0)
const halfH = ref(0)
const scrollY = ref(0)
const reduceMotion = ref(false)

const allImages = Array.from({ length: 30 }, (_, i) => i + 1)

function getCover(index: number): string {
  return `/albums/album-${((index - 1) % 30) + 1}.jpg`
}

const bottomIndex = ref(0)
const topIndex = ref(15)
const bottomFade = ref(1)
const topFade = ref(1)
let cycleTimer: ReturnType<typeof setInterval> | null = null

function cycleImages() {
  bottomFade.value = 0
  topFade.value = 0
  setTimeout(() => {
    bottomIndex.value = (bottomIndex.value + 3) % 30
    topIndex.value = (topIndex.value + 5) % 30
    bottomFade.value = 1
    topFade.value = 1
  }, 800)
}

function onScroll() {
  scrollY.value = window.scrollY
}

function onMouseMove(e: MouseEvent) {
  if (reduceMotion.value) return
  mouseTarget.x = e.clientX
  mouseTarget.y = e.clientY
  mouseX.value = e.clientX
  mouseY.value = e.clientY
}

function onResize() {
  halfW.value = window.innerWidth / 2
  halfH.value = window.innerHeight / 2
  initParticles()
  drawParticles()
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(redrawTopCanvas, 100)
}

let animFrame = 0
const mouseTarget = { x: 0, y: 0 }
const mouseCurrent = { x: 0, y: 0 }
const trail: { x: number; y: number }[] = []
for (let i = 0; i < 8; i++) trail.push({ x: 0, y: 0 })

const topCanvasRef = ref<HTMLCanvasElement | null>(null)
const topImgRef = ref<HTMLImageElement | null>(null)

function redrawTopCanvas() {
  const canvas = topCanvasRef.value
  const img = topImgRef.value
  if (!canvas || !img || !img.complete) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  const cw = canvas.width
  const ch = canvas.height

  const iw = img.naturalWidth
  const ih = img.naturalHeight
  const scale = Math.max(cw / iw, ch / ih)
  const sw = cw / scale
  const sh = ch / scale
  const sx = (iw - sw) / 2
  const sy = (ih - sh) / 2

  ctx.filter = 'brightness(0.7) saturate(1.3) contrast(1.05)'
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch)
  ctx.filter = 'none'

  ctx.globalCompositeOperation = 'destination-out'

  for (const t of trail) {
    const gradient = ctx.createRadialGradient(t.x, t.y, 280, t.x, t.y, 420)
    gradient.addColorStop(0, 'rgba(8,8,12,1)')
    gradient.addColorStop(0.5, 'rgba(8,8,12,0.7)')
    gradient.addColorStop(0.75, 'rgba(8,8,12,0.3)')
    gradient.addColorStop(1, 'rgba(8,8,12,0)')
    ctx.beginPath()
    ctx.arc(t.x, t.y, 420, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()
  }

  ctx.globalCompositeOperation = 'source-over'
}

let resizeTimer: ReturnType<typeof setTimeout> | null = null

function animateLoop() {
  mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * 0.3
  mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * 0.3

  trail.unshift({ x: mouseCurrent.x, y: mouseCurrent.y })
  if (trail.length > 8) trail.pop()

  redrawTopCanvas()
  animFrame = requestAnimationFrame(animateLoop)
}

onMounted(() => {
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  halfW.value = window.innerWidth / 2
  halfH.value = window.innerHeight / 2
  initParticles()
  drawParticles()

  if (!reduceMotion.value) {
    cycleTimer = setInterval(cycleImages, 4000)
    cycleImages()
    animateLoop()
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('resize', onResize)
  window.addEventListener('scroll', onScroll, { passive: true })

  nextTick(() => {
    if (topImgRef.value?.complete) redrawTopCanvas()
  })
})

onUnmounted(() => {
  cancelAnimationFrame(animFrame)
  cancelAnimationFrame(pFrame)
  if (cycleTimer) clearInterval(cycleTimer)
  if (resizeTimer) clearTimeout(resizeTimer)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('scroll', onScroll)
})

interface Particle {
  x: number; y: number; vx: number; vy: number; size: number; opacity: number
}
const canvasRef = ref<HTMLCanvasElement | null>(null)
let particles: Particle[] = []
let pFrame = 0

function initParticles() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    size: Math.random() * 2 + 0.5,
    opacity: Math.random() * 0.4 + 0.05,
  }))
}

function drawParticles() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  for (const p of particles) {
    p.x += p.vx
    p.y += p.vy
    if (p.x < 0) p.x = canvas.width
    if (p.x > canvas.width) p.x = 0
    if (p.y < 0) p.y = canvas.height
    if (p.y > canvas.height) p.y = 0
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${p.opacity})`
    ctx.fill()
  }
  if (!reduceMotion.value) pFrame = requestAnimationFrame(drawParticles)
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-surface-base">
    <canvas ref="canvasRef" class="pointer-events-none fixed inset-0 z-10" />

    <div class="pointer-events-none fixed inset-0 z-0">
      <div
        class="absolute inset-0 bg-cover bg-center bg-no-repeat"
        :style="{
          backgroundImage: `url(${getCover(allImages[bottomIndex] || 1)})`,
          opacity: bottomFade * 0.6,
          transform: `translateX(${(mouseX - halfW) * 0.02}px) translateY(${(mouseY - halfH) * 0.02}px)`,
          filter: 'blur(2px) brightness(0.45) saturate(1.1)',
          transition: 'opacity 0.8s ease, background-image 0.8s ease',
        }"
      />
    </div>

    <canvas ref="topCanvasRef" class="pointer-events-none fixed inset-0 z-20" />
    <img
      ref="topImgRef"
      :src="getCover(allImages[topIndex] || 16)"
      class="hidden"
      :style="{ opacity: topFade, transition: 'opacity 0.8s ease' }"
      @load="redrawTopCanvas"
    />

    <div class="relative z-30 flex min-h-screen flex-col items-center justify-center px-4 pb-20 pt-8 sm:px-8">
    <div class="mb-12 flex items-end gap-3 self-start sm:mb-16">
      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-pink">
          <span class="text-xs text-white font-bold">A</span>
        </div>
      <h1 class="text-2xl font-bold text-white">{{ t('about.title') }}</h1>
      </div>

      <div class="flex flex-1 flex-col items-center justify-center text-center">
        <div class="select-none"
          :style="{
            transform: reduceMotion ? undefined : `translateX(${(mouseX - halfW) * -0.03}px) translateY(${(mouseY - halfH) * -0.05}px)`,
          }"
        >
          <p v-if="!reduceMotion" class="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-white/65 sm:tracking-[0.4em]">
            {{ t('about.prompt') }}
          </p>
          <h2 class="text-6xl font-bold tracking-tighter text-white sm:text-7xl md:text-9xl">
            Audio<span class="text-brand-pink">Sift</span>
          </h2>
          <p class="mt-8 text-lg text-white/75 md:text-2xl">{{ t('about.tagline') }}</p>
          <div class="mt-12 flex flex-wrap items-center justify-center gap-3 sm:gap-6">
            <span class="rounded-full border border-white/[0.10] bg-surface-card/90 px-5 py-2.5 text-sm text-white/70">Demucs</span>
            <span class="rounded-full border border-white/[0.10] bg-surface-card/90 px-5 py-2.5 text-sm text-white/70">FastAPI</span>
            <span class="rounded-full border border-white/[0.10] bg-surface-card/90 px-5 py-2.5 text-sm text-white/70">Vue 3</span>
            <span class="rounded-full border border-white/[0.10] bg-surface-card/90 px-5 py-2.5 text-sm text-white/70">Tailwind</span>
          </div>
        </div>

        <div class="mt-20 grid w-full max-w-4xl gap-4 md:grid-cols-3 md:gap-6">
          <div class="rounded-[28px] border border-white/[0.08] bg-surface-card/90 p-6"
            :style="{ transform: reduceMotion ? undefined : `translateY(${-scrollY * 0.08}px)` }"
          >
            <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue/15 text-brand-blue">
              <MicVocal class="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 class="mb-2 text-sm font-semibold text-white">{{ t('about.vocalTitle') }}</h3>
            <p class="text-sm leading-relaxed text-white/70">{{ t('about.vocalDescription') }}</p>
          </div>
          <div class="rounded-[28px] border border-white/[0.08] bg-surface-card/90 p-6"
            :style="{ transform: reduceMotion ? undefined : `translateY(${-scrollY * 0.05}px)` }"
          >
            <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-purple/15 text-brand-purple">
              <Music2 class="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 class="mb-2 text-sm font-semibold text-white">{{ t('about.musicTitle') }}</h3>
            <p class="text-sm leading-relaxed text-white/70">{{ t('about.musicDescription') }}</p>
          </div>
          <div class="rounded-[28px] border border-white/[0.08] bg-surface-card/90 p-6"
            :style="{ transform: reduceMotion ? undefined : `translateY(${-scrollY * 0.1}px)` }"
          >
            <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange/15 text-brand-orange">
              <Waves class="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 class="mb-2 text-sm font-semibold text-white">{{ t('about.sfxTitle') }}</h3>
            <p class="text-sm leading-relaxed text-white/70">{{ t('about.sfxDescription') }}</p>
          </div>
        </div>

        <p class="mt-24 text-xs text-white/60 tracking-wide">
          {{ reduceMotion ? t('about.reveal') : t('about.footer') }}
        </p>
      </div>
    </div>
  </div>
</template>
