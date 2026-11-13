<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { ZoomIn, ZoomOut, Trash2 } from 'lucide-vue-next'
import { useAudioStore } from '@/composables/useAudioStore'
import { extractPeaks, formatTime, generateUUID } from '@/composables/useAudioUtils'
import { t } from '@/i18n'

const { state, addTimeSelection, removeTimeSelection } = useAudioStore()

const canvasRef = ref<HTMLCanvasElement>()
const containerRef = ref<HTMLDivElement>()
const zoom = ref(1)
const scrollOffset = ref(0)
const isSelecting = ref(false)
const selectionStart = ref(0)
const selectionEnd = ref(0)
const keyboardStart = ref(0)
const keyboardEnd = ref(0)

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

  if (zoom.value > 1) {
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 0.5
    for (let x = 100; x < width; x += 100) {
      const timeAtX = visibleStart + (x / width) * visibleDuration
      ctx.beginPath()
      ctx.moveTo(x, height - 24)
      ctx.lineTo(x, height)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '10px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(formatTime(timeAtX), x, height - 28)
    }
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(0, midY)
  ctx.lineTo(width, midY)
  ctx.stroke()

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

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  const canvas = e.currentTarget as HTMLCanvasElement
  canvas.setPointerCapture(e.pointerId)
  const time = getTimeFromX(e.clientX)
  isSelecting.value = true
  selectionStart.value = time
  selectionEnd.value = time
}

function onPointerMove(e: PointerEvent) {
  if (!isSelecting.value) return
  selectionEnd.value = getTimeFromX(e.clientX)
}

function onPointerUp(e: PointerEvent) {
  if (!isSelecting.value) return
  const start = Math.min(selectionStart.value, selectionEnd.value)
  const end = Math.max(selectionStart.value, selectionEnd.value)
  if (end - start > 0.1) {
    addTimeSelection({ id: generateUUID(), startTime: start, endTime: end })
  }
  isSelecting.value = false
  const canvas = e.currentTarget as HTMLCanvasElement
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  zoom.value = Math.max(1, Math.min(50, zoom.value - e.deltaY * 0.01))
}

function changeZoom(delta: number) {
  zoom.value = Math.max(1, Math.min(50, zoom.value + delta))
}

function updateKeyboardStart(e: Event) {
  const value = Number((e.target as HTMLInputElement).value)
  keyboardStart.value = Math.min(value, Math.max(0, keyboardEnd.value - 0.1))
}

function updateKeyboardEnd(e: Event) {
  const value = Number((e.target as HTMLInputElement).value)
  keyboardEnd.value = Math.max(value, Math.min(state.audioDuration, keyboardStart.value + 0.1))
}

function addKeyboardSelection() {
  if (keyboardEnd.value - keyboardStart.value < 0.1) return
  addTimeSelection({
    id: generateUUID(),
    startTime: keyboardStart.value,
    endTime: keyboardEnd.value,
  })
}

watch([zoom, scrollOffset, () => state.timeSelections, isSelecting, selectionStart, selectionEnd], () => {
  nextTick(draw)
})

watch(() => state.audioBuffer, () => {
  if (state.audioBuffer) {
    keyboardStart.value = 0
    keyboardEnd.value = Math.min(state.audioDuration, 30)
    nextTick(draw)
  }
})

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
          @click="changeZoom(-2)"
        >
          <ZoomOut class="h-3.5 w-3.5" />
        </button>
        <span class="min-w-[40px] text-center text-xs text-white/55">{{ zoom.toFixed(0) }}x</span>
        <button
          class="flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white/70"
          @click="changeZoom(2)"
        >
          <ZoomIn class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <div ref="containerRef" class="relative overflow-hidden rounded-lg border border-white/[0.08] bg-surface-base/20 backdrop-blur-sm">
      <canvas
        ref="canvasRef"
        class="h-32 w-full touch-pan-y cursor-crosshair"
        role="img"
        :aria-label="t('wave.canvasLabel')"
        aria-describedby="wave-hint"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @wheel="onWheel"
      />
    </div>

    <div class="grid gap-3 rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label class="flex flex-col gap-2 text-xs text-white/65">
        <span>{{ t('wave.startTime', { time: formatTime(keyboardStart) }) }}</span>
        <input
          type="range"
          min="0"
          :max="Math.max(0, keyboardEnd - 0.1)"
          step="0.1"
          :value="keyboardStart"
          :disabled="state.audioDuration < 0.1"
          class="range-slider"
          :aria-label="t('wave.startTime', { time: formatTime(keyboardStart) })"
          @input="updateKeyboardStart"
        />
      </label>
      <label class="flex flex-col gap-2 text-xs text-white/65">
        <span>{{ t('wave.endTime', { time: formatTime(keyboardEnd) }) }}</span>
        <input
          type="range"
          :min="Math.min(state.audioDuration, keyboardStart + 0.1)"
          :max="state.audioDuration"
          step="0.1"
          :value="keyboardEnd"
          :disabled="state.audioDuration < 0.1"
          class="range-slider"
          :aria-label="t('wave.endTime', { time: formatTime(keyboardEnd) })"
          @input="updateKeyboardEnd"
        />
      </label>
      <button
        class="rounded-full border border-white/[0.12] bg-white/[0.05] px-4 py-2 text-xs font-medium text-white/75 transition-colors hover:bg-white/[0.10]"
        :disabled="state.audioDuration < 0.1"
        @click="addKeyboardSelection"
      >
        {{ t('wave.addSelection') }}
      </button>
    </div>

    <div v-if="state.timeSelections.length > 0" class="flex flex-col gap-1.5">
      <div
        v-for="sel in state.timeSelections"
        :key="sel.id"
        class="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-1.5"
      >
        <div class="h-2 w-2 rounded-full bg-brand-blue" />
        <span class="font-mono text-xs text-white/60">
          {{ formatTime(sel.startTime) }} - {{ formatTime(sel.endTime) }}
        </span>
        <span class="text-xs text-white/45">({{ (sel.endTime - sel.startTime).toFixed(1) }}s)</span>
        <button
          class="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-semantic-error/10 hover:text-semantic-error"
          :aria-label="t('wave.removeSelection', { start: formatTime(sel.startTime), end: formatTime(sel.endTime) })"
          :title="t('wave.removeSelection', { start: formatTime(sel.startTime), end: formatTime(sel.endTime) })"
          @click="removeTimeSelection(sel.id)"
        >
          <Trash2 class="h-3 w-3" />
        </button>
      </div>
    </div>

    <p id="wave-hint" class="text-xs text-white/55">
      {{ t('wave.hint') }}
    </p>
  </div>
</template>
