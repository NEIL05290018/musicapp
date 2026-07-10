<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const mouseX = ref(0)
const mouseY = ref(0)
const halfW = ref(0)
const halfH = ref(0)
const scrollY = ref(0)

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
    gradient.addColorStop(0, 'rgba(0,0,0,1)')
    gradient.addColorStop(0.5, 'rgba(0,0,0,0.7)')
    gradient.addColorStop(0.75, 'rgba(0,0,0,0.3)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
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
  halfW.value = window.innerWidth / 2
  halfH.value = window.innerHeight / 2
  initParticles()
  drawParticles()

  cycleTimer = setInterval(cycleImages, 4000)
  cycleImages()

  window.addEventListener('mousemove', (e: MouseEvent) => {
    mouseTarget.x = e.clientX
    mouseTarget.y = e.clientY
    mouseX.value = e.clientX
    mouseY.value = e.clientY
  })
  window.addEventListener('resize', () => {
    halfW.value = window.innerWidth / 2
    halfH.value = window.innerHeight / 2
    initParticles()
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(redrawTopCanvas, 100)
  })
  window.addEventListener('scroll', onScroll, { passive: true })

  nextTick(() => {
    if (topImgRef.value?.complete) redrawTopCanvas()
  })
  animateLoop()
})

onUnmounted(() => {
  cancelAnimationFrame(animFrame)
  cancelAnimationFrame(pFrame)
  if (cycleTimer) clearInterval(cycleTimer)
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
  pFrame = requestAnimationFrame(drawParticles)
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-black">
    <canvas ref="canvasRef" class="pointer-events-none fixed inset-0 z-10" />

    <div class="pointer-events-none fixed inset-0 z-0">
      <div
        class="absolute inset-0 bg-cover bg-center bg-no-repeat"
        :style="{
          backgroundImage: `url(${getCover(allImages[bottomIndex] || 1)})`,
          opacity: bottomFade * 0.6,
          transform: `translateX(${(mouseX - halfW) * 0.02}px) translateY(${(mouseY - halfH) * 0.02}px)`,
          filter: 'blur(2px) brightness(0.7) saturate(1.2)',
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

    <div class="relative z-30 flex min-h-screen flex-col items-center justify-center px-8 pb-20 pt-8">
      <div class="mb-16 flex items-end gap-3 self-start">
        <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#5b9cff] to-[#e04090]">
          <span class="text-xs text-white font-bold">A</span>
        </div>
        <h1 class="text-2xl font-bold text-white">About</h1>
      </div>

      <div class="flex flex-1 flex-col items-center justify-center text-center">
        <div class="select-none"
          :style="{
            transform: `translateX(${(mouseX - halfW) * -0.03}px) translateY(${(mouseY - halfH) * -0.05}px)`,
          }"
        >
          <p class="mb-4 text-sm font-medium uppercase tracking-[0.4em] text-white/20">Move your mouse to reveal</p>
          <h2 class="text-7xl font-bold tracking-tighter text-white md:text-9xl">
            Audio<span class="text-[#e04090]">Sift</span>
          </h2>
          <p class="mt-8 text-xl text-white/25 md:text-2xl">AI-Powered Audio Separation Engine</p>
          <div class="mt-12 flex items-center justify-center gap-6">
            <span class="rounded-full border border-white/[0.06] bg-white/[0.04] px-5 py-2.5 text-sm text-white/35 backdrop-blur-xl">Demucs</span>
            <span class="rounded-full border border-white/[0.06] bg-white/[0.04] px-5 py-2.5 text-sm text-white/35 backdrop-blur-xl">FastAPI</span>
            <span class="rounded-full border border-white/[0.06] bg-white/[0.04] px-5 py-2.5 text-sm text-white/35 backdrop-blur-xl">Vue 3</span>
            <span class="rounded-full border border-white/[0.06] bg-white/[0.04] px-5 py-2.5 text-sm text-white/35 backdrop-blur-xl">Tailwind</span>
          </div>
        </div>

        <div class="mt-20 grid w-full max-w-4xl gap-6 md:grid-cols-3">
          <div class="rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-xl p-6"
            :style="{ transform: `translateY(${-scrollY * 0.08}px)` }"
          >
            <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f8fff]/30 to-[#4f8fff]/10">
              <span class="text-lg">🎤</span>
            </div>
            <h3 class="mb-2 text-sm font-semibold text-white/80">Vocal Extraction</h3>
            <p class="text-xs leading-relaxed text-white/35">Precision vocal isolation from any audio source.</p>
          </div>
          <div class="rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-xl p-6"
            :style="{ transform: `translateY(${-scrollY * 0.05}px)` }"
          >
            <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#b464ff]/30 to-[#b464ff]/10">
              <span class="text-lg">🎸</span>
            </div>
            <h3 class="mb-2 text-sm font-semibold text-white/80">Instrumental Split</h3>
            <p class="text-xs leading-relaxed text-white/35">Extract pure backing tracks with ease.</p>
          </div>
          <div class="rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-xl p-6"
            :style="{ transform: `translateY(${-scrollY * 0.1}px)` }"
          >
            <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff8c3c]/30 to-[#ff8c3c]/10">
              <span class="text-lg">🥁</span>
            </div>
            <h3 class="mb-2 text-sm font-semibold text-white/80">Drum Separation</h3>
            <p class="text-xs leading-relaxed text-white/35">Isolate beats and percussion for remixing.</p>
          </div>
        </div>

        <p class="mt-24 text-[10px] text-white/10 tracking-[0.3em] uppercase">
          Move your mouse to reveal · Powered by Demucs · Deployed on Alibaba Cloud
        </p>
      </div>
    </div>
  </div>
</template>
