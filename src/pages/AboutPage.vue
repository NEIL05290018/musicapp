<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight, AudioLines, Cloud, Download, Layers3, MicVocal, Music2,
  SlidersHorizontal, Sparkles, Waves,
} from 'lucide-vue-next'
import { t } from '@/i18n'

const router = useRouter()
const mouseX = ref(0)
const mouseY = ref(0)
const halfW = ref(0)
const halfH = ref(0)
const reduceMotion = ref(false)

const allImages = Array.from({ length: 30 }, (_, i) => i + 1)

const highlights = [
  { value: '100 MB', label: 'about.metricUpload' },
  { value: '3', label: 'about.metricStems' },
  { value: '6', label: 'about.metricFormats' },
]

const features = [
  {
    icon: MicVocal,
    title: 'about.vocalTitle',
    description: 'about.vocalDescription',
    color: 'text-brand-blue',
    background: 'bg-brand-blue/15',
  },
  {
    icon: Music2,
    title: 'about.musicTitle',
    description: 'about.musicDescription',
    color: 'text-brand-purple',
    background: 'bg-brand-purple/15',
  },
  {
    icon: Waves,
    title: 'about.sfxTitle',
    description: 'about.sfxDescription',
    color: 'text-brand-orange',
    background: 'bg-brand-orange/15',
  },
]

const steps = [
  { icon: AudioLines, title: 'about.stepUploadTitle', description: 'about.stepUploadDescription' },
  { icon: SlidersHorizontal, title: 'about.stepSelectTitle', description: 'about.stepSelectDescription' },
  { icon: Sparkles, title: 'about.stepSeparateTitle', description: 'about.stepSeparateDescription' },
  { icon: Download, title: 'about.stepExportTitle', description: 'about.stepExportDescription' },
]

const architecture = [
  { icon: AudioLines, title: 'about.architectureInputTitle', detail: 'about.architectureInputDetail' },
  { icon: Cloud, title: 'about.architectureEngineTitle', detail: 'about.architectureEngineDetail' },
  { icon: Layers3, title: 'about.architectureOutputTitle', detail: 'about.architectureOutputDetail' },
]

const waveformBars = [18, 30, 22, 46, 34, 60, 42, 26, 52, 72, 38, 58, 28, 44, 66, 32, 54, 24, 42, 62, 34, 50, 26, 40, 58, 30, 48, 22, 36, 54, 28, 44, 20, 34, 50, 24, 40, 18, 30, 46]

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

    <div class="relative z-30 mx-auto w-full max-w-[1120px] px-4 pb-24 pt-8 sm:px-8 lg:px-10">
      <header class="mb-10 flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-pink">
          <span class="text-sm font-bold text-white">A</span>
        </div>
        <h1 class="text-lg font-semibold text-white">{{ t('about.title') }}</h1>
      </header>

      <div>
        <section class="grid items-center gap-10 pb-16 pt-6 md:grid-cols-[1.05fr_0.95fr] md:gap-12 md:pb-24 md:pt-12" aria-labelledby="about-hero-title">
          <div
            class="green-card p-5 sm:p-7"
            :style="{
              transform: reduceMotion ? undefined : `translateX(${(mouseX - halfW) * -0.01}px) translateY(${(mouseY - halfH) * -0.015}px)`,
            }"
          >
            <p class="mb-5 inline-flex items-center gap-2 rounded-full border border-ink-black/15 bg-ink-black/[0.06] px-4 py-2 text-xs font-medium text-ink-black">
              <Sparkles class="h-4 w-4 text-brand-pink" aria-hidden="true" />
              {{ t('about.eyebrow') }}
            </p>
            <h2 id="about-hero-title" class="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Audio<span class="text-brand-pink">Sift</span>
            </h2>
            <p class="mt-5 max-w-xl text-xl font-semibold leading-relaxed text-white/90 sm:text-2xl">
              {{ t('about.heroTitle') }}
            </p>
            <p class="mt-4 max-w-xl text-sm leading-7 text-ink-secondary sm:text-base">
              {{ t('about.heroDescription') }}
            </p>
            <div class="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-pink px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-pink-hover active:bg-brand-pink-active"
                @click="router.push('/')"
              >
                {{ t('about.openWorkbench') }}
                <ArrowRight class="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="inline-flex min-h-11 items-center justify-center rounded-full border border-ink-black/15 bg-ink-black/[0.06] px-5 py-3 text-sm font-medium text-ink-black transition-colors hover:bg-ink-black/[0.10]"
                @click="router.push('/discover')"
              >
                {{ t('about.exploreMusic') }}
              </button>
            </div>
            <div class="mt-8 flex flex-wrap gap-2" :aria-label="t('about.technologyLabel')">
              <span
                v-for="technology in ['Demucs', 'FastAPI', 'Vue 3', 'TypeScript', 'Tailwind CSS']"
                :key="technology"
                class="rounded-full border border-ink-black/15 bg-ink-black/[0.06] px-3 py-1.5 text-xs text-ink-black"
              >
                {{ technology }}
              </span>
            </div>
          </div>

          <div class="green-card relative overflow-hidden p-5 sm:p-7">
            <div class="relative flex items-center justify-between gap-4">
              <div>
                <p class="text-xs font-medium uppercase tracking-[0.18em] text-white/55">{{ t('about.previewLabel') }}</p>
                <p class="mt-2 text-sm font-semibold text-white">{{ t('about.previewFile') }}</p>
              </div>
              <span class="rounded-full border border-semantic-success/25 bg-semantic-success/10 px-3 py-1.5 text-xs font-medium text-semantic-success">
                {{ t('about.previewReady') }}
              </span>
            </div>
            <div class="white-card relative mt-8 flex h-28 items-center gap-[3px] overflow-hidden px-3 sm:h-36 sm:gap-1 sm:px-5" role="img" :aria-label="t('about.waveformLabel')">
              <span
                v-for="(height, index) in waveformBars"
                :key="index"
                class="flex-1 rounded-full bg-brand-blue/75"
                :style="{ height: `${height}%`, opacity: 0.45 + (height / 140) }"
              />
              <div class="pointer-events-none absolute inset-y-3 left-[28%] w-[42%] rounded-lg border border-brand-pink/60 bg-brand-pink/10">
                <span class="absolute -left-px top-0 h-full w-px bg-brand-pink" />
                <span class="absolute -right-px top-0 h-full w-px bg-brand-pink" />
              </div>
            </div>
            <div class="relative mt-5 flex flex-wrap gap-2">
              <span v-for="feature in features" :key="feature.title" class="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white/75">
                <component :is="feature.icon" class="h-3.5 w-3.5" :class="feature.color" aria-hidden="true" />
                {{ t(feature.title) }}
              </span>
            </div>
          </div>
        </section>

        <section class="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4" :aria-label="t('about.highlightsLabel')">
          <div v-for="item in highlights" :key="item.label" class="green-card flex items-center gap-4 p-5 sm:p-6">
            <span class="text-3xl font-bold tracking-tight text-white sm:text-4xl">{{ item.value }}</span>
            <span class="max-w-[150px] text-sm leading-5 text-ink-secondary">{{ t(item.label) }}</span>
          </div>
        </section>

        <section class="mt-20 sm:mt-28" aria-labelledby="about-features-title">
          <div class="mb-8 max-w-2xl">
            <p class="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-pink">{{ t('about.featuresEyebrow') }}</p>
            <h2 id="about-features-title" class="text-3xl font-bold tracking-tight text-white sm:text-4xl">{{ t('about.featuresTitle') }}</h2>
            <p class="mt-4 text-sm leading-7 text-ink-secondary sm:text-base">{{ t('about.featuresDescription') }}</p>
          </div>
          <div class="grid gap-4 md:grid-cols-3 md:gap-5">
            <article v-for="feature in features" :key="feature.title" class="green-card p-6 sm:p-7">
              <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl" :class="[feature.background, feature.color]">
                <component :is="feature.icon" class="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 class="text-lg font-semibold text-white">{{ t(feature.title) }}</h3>
              <p class="mt-3 text-sm leading-6 text-ink-secondary">{{ t(feature.description) }}</p>
            </article>
          </div>
        </section>

        <section class="mt-20 sm:mt-28" aria-labelledby="about-workflow-title">
          <div class="mb-8 max-w-2xl">
            <p class="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">{{ t('about.workflowEyebrow') }}</p>
            <h2 id="about-workflow-title" class="text-3xl font-bold tracking-tight text-white sm:text-4xl">{{ t('about.workflowTitle') }}</h2>
            <p class="mt-4 text-sm leading-7 text-ink-secondary sm:text-base">{{ t('about.workflowDescription') }}</p>
          </div>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article v-for="(step, index) in steps" :key="step.title" class="green-card relative min-h-[220px] p-6">
              <div class="mb-8 flex items-center justify-between">
                <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-blue/15 text-brand-blue">
                  <component :is="step.icon" class="h-5 w-5" aria-hidden="true" />
                </div>
                <span class="text-xs font-semibold tracking-[0.16em] text-white/45">0{{ index + 1 }}</span>
              </div>
              <h3 class="text-base font-semibold text-white">{{ t(step.title) }}</h3>
              <p class="mt-2 text-sm leading-6 text-ink-secondary">{{ t(step.description) }}</p>
            </article>
          </div>
        </section>

        <section class="green-card mt-20 p-6 sm:mt-28 sm:p-9" aria-labelledby="about-architecture-title">
          <div class="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p class="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-purple">{{ t('about.architectureEyebrow') }}</p>
              <h2 id="about-architecture-title" class="text-2xl font-bold tracking-tight text-white sm:text-3xl">{{ t('about.architectureTitle') }}</h2>
              <p class="mt-4 text-sm leading-7 text-ink-secondary">{{ t('about.architectureDescription') }}</p>
              <p class="mt-5 text-xs leading-5 text-white/55">{{ t('about.footer') }}</p>
            </div>
            <div class="grid gap-3 sm:grid-cols-3">
              <article v-for="item in architecture" :key="item.title" class="white-card p-5">
                <component :is="item.icon" class="mb-5 h-5 w-5 text-brand-purple" aria-hidden="true" />
                <h3 class="text-sm font-semibold text-white">{{ t(item.title) }}</h3>
                <p class="mt-2 text-xs leading-5 text-ink-secondary">{{ t(item.detail) }}</p>
              </article>
            </div>
          </div>
        </section>

        <section class="green-card mt-16 overflow-hidden px-6 py-10 text-center sm:px-10 sm:py-14" aria-labelledby="about-cta-title">
          <p class="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-pink">{{ t('about.ctaEyebrow') }}</p>
          <h2 id="about-cta-title" class="mx-auto max-w-2xl text-2xl font-bold tracking-tight text-white sm:text-3xl">{{ t('about.ctaTitle') }}</h2>
          <p class="mx-auto mt-4 max-w-xl text-sm leading-6 text-ink-secondary">{{ t('about.ctaDescription') }}</p>
          <button
            type="button"
            class="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-pink px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-pink-hover active:bg-brand-pink-active"
            @click="router.push('/')"
          >
            {{ t('about.openWorkbench') }}
            <ArrowRight class="h-4 w-4" aria-hidden="true" />
          </button>
        </section>

        <footer class="mt-10 flex flex-col gap-2 border-t border-white/[0.08] pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <span>AudioSift · {{ t('about.tagline') }}</span>
          <span>{{ reduceMotion ? t('about.reveal') : t('about.footer') }}</span>
        </footer>
      </div>
    </div>
  </div>
</template>
