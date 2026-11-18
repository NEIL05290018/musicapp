<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { ZoomIn, ZoomOut } from 'lucide-vue-next'
import { useAudioStore } from '@/composables/useAudioStore'
import { extractPeaks, formatTime } from '@/composables/useAudioUtils'
import { playback, previewSelection } from '@/composables/useWorkspacePlayback'
import { t } from '@/i18n'

const { state, addTimeSelection, clearTimeSelections } = useAudioStore()

const canvasRef = ref<HTMLCanvasElement>()
const containerRef = ref<HTMLDivElement>()
const zoom = ref(1)
const scrollOffset = ref(0)
const isSelecting = ref(false)
const selectionStart = ref(0)
const selectionEnd = ref(0)
const range = computed(() => state.timeSelections[0])
let dragEdge: 'start' | 'end' | null = null
function setRange(start: number, end: number) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return
  end = Math.min(state.audioDuration, Math.max(0.1, end))
  start = Math.max(0, Math.min(start, end - 0.1))
  addTimeSelection({ id: 'selection', startTime: start, endTime: end })
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas || !state.audioBuffer) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  const width = rect.width
  const height = rect.height

  if (width === 0 || height === 0) return

  canvas.width = width * dpr
  canvas.height = height * dpr
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, width, height)

  const visibleDuration = state.audioDuration / zoom.value
  const visibleStart = (state.audioDuration - visibleDuration) * scrollOffset.value
  const visibleEnd = visibleStart + visibleDuration

  const peaks = extractPeaks(state.audioBuffer, Math.floor(width), visibleStart, visibleEnd)
  const midY = height / 2

  for (let i = 0; i < peaks.length; i++) {
    const x = (i / peaks.length) * width
    const peakHeight = peaks[i] * (height * 0.42)
    const alpha = 0.15 + peaks[i] * 0.7
    ctx.fillStyle = `rgba(79,143,255,${alpha})`
    ctx.fillRect(x, midY - peakHeight, Math.max(1, width / peaks.length), peakHeight * 2)
  }

  {
    ctx.strokeStyle = 'rgba(215, 230, 255, .4)'
    ctx.lineWidth = 0.5
    for (let x = 100; x < width; x += 100) {
      const timeAtX = visibleStart + (x / width) * visibleDuration
      ctx.beginPath()
      ctx.moveTo(x, height - 24)
      ctx.lineTo(x, height)
      ctx.stroke()
      ctx.fillStyle = '#dce7fa'
      ctx.font = '10px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(formatTime(timeAtX), x, height - 9)
    }
  }

  ctx.strokeStyle = 'rgba(215, 230, 255, .2)'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(0, midY)
  ctx.lineTo(width, midY)
  ctx.stroke()

  const cursor = (playback.position - visibleStart) / visibleDuration * width
  ctx.fillStyle = '#ff9bc8'
  ctx.fillRect(cursor, 0, 2, height)
  state.timeSelections.forEach((sel) => {
    const selStart = ((sel.startTime - visibleStart) / visibleDuration) * width
    const selEnd = ((sel.endTime - visibleStart) / visibleDuration) * width
    if (selEnd < 0 || selStart > width) return
    const clipStart = Math.max(0, selStart)
    const clipEnd = Math.min(width, selEnd)

    ctx.fillStyle = 'rgba(79,143,255,0.1)'
    ctx.fillRect(clipStart, 0, clipEnd - clipStart, height)
    ctx.strokeStyle = '#4f8fff'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(clipStart, 0)
    ctx.lineTo(clipStart, height)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(clipEnd, 0)
    ctx.lineTo(clipEnd, height)
    ctx.stroke()
    ctx.fillStyle = '#4f8fff'
    ctx.fillRect(clipStart - 3, 0, 6, height)
    ctx.fillRect(clipEnd - 3, 0, 6, height)
  })

  if (isSelecting.value) {
    const selStart = ((selectionStart.value - visibleStart) / visibleDuration) * width
    const selEnd = ((selectionEnd.value - visibleStart) / visibleDuration) * width
    if (selEnd > 0 && selStart < width) {
      const clipStart = Math.max(0, selStart)
      const clipEnd = Math.min(width, selEnd)
      ctx.fillStyle = 'rgba(224,64,144,0.15)'
      ctx.fillRect(clipStart, 0, clipEnd - clipStart, height)
      ctx.strokeStyle = '#e04090'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(clipStart, 0)
      ctx.lineTo(clipStart, height)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(clipEnd, 0)
      ctx.lineTo(clipEnd, height)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }
}

function getTimeFromX(clientX: number): number {
  const canvas = canvasRef.value
  if (!canvas) return 0
  const rect = canvas.getBoundingClientRect()
  const x = Math.min(rect.width, Math.max(0, clientX - rect.left))
  const visibleDuration = state.audioDuration / zoom.value
  const visibleStart = (state.audioDuration - visibleDuration) * scrollOffset.value
  return Math.min(state.audioDuration, Math.max(0, visibleStart + (x / rect.width) * visibleDuration))
}

function onPointerDown(e: PointerEvent, edge?: 'start' | 'end') {
  if (e.button !== 0) return
  const canvas = canvasRef.value!
  canvas.setPointerCapture(e.pointerId)
  const time = getTimeFromX(e.clientX)
  isSelecting.value = true
  const tolerance = state.audioDuration / zoom.value * 12 / canvas.getBoundingClientRect().width
  dragEdge = edge ?? (Math.abs(time - (range.value?.startTime ?? -1)) < tolerance ? 'start'
    : Math.abs(time - (range.value?.endTime ?? -1)) < tolerance ? 'end' : null)
  selectionStart.value = dragEdge ? range.value!.startTime : time
  selectionEnd.value = dragEdge ? range.value!.endTime : time
}

function onPointerMove(e: PointerEvent) {
  if (!isSelecting.value) return
  const time = getTimeFromX(e.clientX)
  if (dragEdge === 'start') selectionStart.value = Math.min(time, selectionEnd.value - 0.1)
  else if (dragEdge === 'end') selectionEnd.value = Math.max(time, selectionStart.value + 0.1)
  else selectionEnd.value = time
}

function onPointerUp(e: PointerEvent) {
  if (!isSelecting.value) return
  const start = Math.min(selectionStart.value, selectionEnd.value)
  const end = Math.max(selectionStart.value, selectionEnd.value)
  if (end - start > 0.1) {
    setRange(start, end)
  }
  isSelecting.value = false
  const canvas = e.currentTarget as HTMLCanvasElement
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
}

function handlePosition(edge: 'start' | 'end') {
  if (!range.value) return { display: 'none' }
  const duration = state.audioDuration / zoom.value
  const visibleStart = (state.audioDuration - duration) * scrollOffset.value
  const percent = ((edge === 'start' ? range.value.startTime : range.value.endTime) - visibleStart) / duration * 100
  return { left: 'clamp(22px, ' + percent + '%, calc(100% - 22px))', display: percent < 0 || percent > 100 ? 'none' : undefined }
}
function moveHandle(event: KeyboardEvent, edge: 'start' | 'end') {
  if (!range.value || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  const delta = (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 1 : .1)
  if (edge === 'start') setRange(range.value.startTime + delta, range.value.endTime)
  else setRange(range.value.startTime, Math.max(range.value.startTime + .1, range.value.endTime + delta))
}

function onWheel(e: WheelEvent) {
  if (!e.ctrlKey) return
  e.preventDefault()
  changeZoom(e.deltaY < 0 ? 1 : -1)
}

function changeZoom(delta: number) {
  const center = (range.value ? (range.value.startTime + range.value.endTime) / 2 : playback.position)
  zoom.value = Math.max(1, Math.min(50, zoom.value + delta))
  const duration = state.audioDuration / zoom.value
  scrollOffset.value = zoom.value === 1 ? 0 : Math.max(0, Math.min(1, (center - duration / 2) / (state.audioDuration - duration)))
}

watch([zoom, scrollOffset, () => state.timeSelections, isSelecting, selectionStart, selectionEnd, () => playback.position], () => {
  nextTick(draw)
})

watch(() => state.audioDuration, () => {
  zoom.value = 1
  scrollOffset.value = 0
  if (!range.value && state.audioDuration >= 0.1) setRange(0, state.audioDuration)
  nextTick(draw)
}, { immediate: true })

onMounted(() => {
  window.addEventListener('resize', draw)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => draw())
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', draw)
})
</script>

<template>
  <div v-if="state.audioBuffer" class="glass-card flex flex-col gap-3 p-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold text-white/60">{{ t('wave.title') }}</span>
        <span class="rounded bg-white/[0.06] px-2 py-0.5 text-xs text-white/50">
          {{ formatTime(state.audioDuration) }}
        </span>
      </div>
      <div class="flex items-center gap-1">
        <button
          class="flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white/70"
          :aria-label="t('work.zoomOut')" @click="changeZoom(-1)"
        >
          <ZoomOut class="h-3.5 w-3.5" />
        </button>
        <span class="min-w-[40px] text-center text-xs text-white/55">{{ zoom.toFixed(0) }}x</span>
        <button
          class="flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white/70"
          :aria-label="t('work.zoomIn')" @click="changeZoom(1)"
        >
          <ZoomIn class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <div ref="containerRef" class="white-card relative overflow-hidden backdrop-blur-sm">
      <canvas
        ref="canvasRef"
        class="h-40 w-full touch-none cursor-crosshair"
        role="img"
        :aria-label="t('wave.canvasLabel')"
        aria-describedby="wave-hint"
        @pointerdown="onPointerDown($event)"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="isSelecting = false"
        @wheel="onWheel"
      />
      <button v-for="edge in (['start', 'end'] as const)" :key="edge"
        class="selection-handle" :style="handlePosition(edge)"
        :aria-label="t('p0.handle.' + edge)" :title="t('p0.handleHint')"
        @pointerdown.stop.prevent="onPointerDown($event, edge)" @keydown="moveHandle($event, edge)">
        <span aria-hidden="true">⋮</span>
      </button>
    </div>

    <label v-if="zoom > 1"  class="text-sm">{{ t('work.pan') }}
      <input class="range-slider my-3" type="range" min="0" max="1" step="0.001" v-model.number="scrollOffset" />
    </label>
    <div v-if="range" class="grid gap-4 sm:grid-cols-2">
      <label class="text-sm">{{ t('work.start') }}
        <input class="workspace-input" type="number" min="0" :max="range.endTime - 0.1" step="0.1" :value="Number(range.startTime.toFixed(2))" @change="setRange(Number(($event.target as HTMLInputElement).value), range.endTime)" />
      </label>
      <label class="text-sm">{{ t('work.end') }}
        <input class="workspace-input" type="number" :min="range.startTime + 0.1" :max="state.audioDuration" step="0.1" :value="Number(range.endTime.toFixed(2))" @change="setRange(range.startTime, Number(($event.target as HTMLInputElement).value))" />
      </label>
    </div>
    <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
      <span>{{ t('work.selected') }} {{ formatTime(range?.startTime ?? 0) }} – {{ formatTime(range?.endTime ?? state.audioDuration) }} · {{ ((range?.endTime ?? state.audioDuration) - (range?.startTime ?? 0)).toFixed(1) }} s</span>
      <button class="workspace-primary" @click="previewSelection()">{{ t('p0.preview') }}</button>
      <button class="workspace-button" @click="clearTimeSelections(); setRange(0, state.audioDuration); zoom = 1">{{ t('work.full') }}</button>
    </div>
    <p id="wave-hint" class="text-xs text-white/55">
      {{ t('wave.hint') }}
    </p>
  </div>
</template>
