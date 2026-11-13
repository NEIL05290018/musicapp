<script setup lang="ts">
import { computed, ref } from 'vue'
import { Play, Square, Sparkles, Loader2 } from 'lucide-vue-next'
import { useAudioStore } from '@/composables/useAudioStore'
import { STEM_COLORS, uploadAndSeparate, pollStatus } from '@/composables/useAudioUtils'
import { t } from '@/i18n'
import type { StemType } from '@/composables/useAudioStore'

const { state, toggleStem, setSeparationStatus, setSeparationProgress, setSeparationError, setTaskId, setResults } = useAudioStore()

const STEMS = computed<{ key: StemType; label: string }[]>(() => [
  { key: 'vocals', label: t('stem.vocals') },
  { key: 'music', label: t('stem.music') },
  { key: 'sfx', label: t('stem.sfx') },
])

const canSeparate = () => state.audioBuffer && state.activeStems.length > 0
const isRunning = () => state.separationStatus === 'processing' || state.separationStatus === 'uploading'

let pollTimer: ReturnType<typeof setInterval> | null = null

function startPolling(taskId: string) {
  pollTimer = setInterval(async () => {
    try {
      const res = await pollStatus(taskId)
      setSeparationProgress(res.progress)

      if (res.status === 'done' && res.stems) {
        setResults(res.stems)
        setSeparationStatus('done')
        setSeparationProgress(100)
        clearPolling()
      } else if (res.status === 'error') {
        setSeparationError(res.error || t('sep.failed'))
        setSeparationStatus('error')
        clearPolling()
      } else if (res.status === 'processing') {
        setSeparationStatus('processing')
      }
    } catch (err) {
      setSeparationError(err instanceof Error ? err.message : t('sep.pollFailed'))
      setSeparationStatus('error')
      clearPolling()
    }
  }, 2000)
}

function clearPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function handleSeparate() {
  if (!canSeparate() || !state.audioFile) return

  setSeparationStatus('uploading')
  setSeparationProgress(0)
  setSeparationError(null)

  try {
    const startTime = state.timeSelections.length > 0 ? state.timeSelections[0].startTime : 0
    const endTime = state.timeSelections.length > 0 ? state.timeSelections[0].endTime : -1

    const res = await uploadAndSeparate(state.audioFile, startTime, endTime, state.activeStems)
    setTaskId(res.task_id)
    setSeparationStatus('processing')
    setSeparationProgress(10)
    startPolling(res.task_id)
  } catch (err) {
    setSeparationError(err instanceof Error ? err.message : t('sep.requestFailed'))
    setSeparationStatus('error')
  }
}

function handleStop() {
  clearPolling()
  setSeparationStatus('idle')
  setSeparationProgress(0)
}
</script>

<template>
  <div class="glass-card flex flex-col gap-4 p-4">
    <div class="flex items-center gap-2">
      <Sparkles class="h-4 w-4 text-[#e04090]" />
      <span class="text-xs font-semibold text-ink-secondary">{{ t('sep.title') }}</span>
      <span class="ml-auto rounded-full bg-[#e04090]/15 px-2 py-0.5 text-xs font-medium text-[#e04090]">Demucs v4</span>
    </div>

    <div class="flex gap-2">
      <button
        v-for="stem in STEMS"
        :key="stem.key"
        class="flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-300"
        :class="state.activeStems.includes(stem.key) ? 'text-white' : 'text-ink-muted hover:text-ink-secondary'"
        :aria-pressed="state.activeStems.includes(stem.key)"
        :style="{
          backgroundColor: state.activeStems.includes(stem.key) ? STEM_COLORS[stem.key].bg : 'rgba(255,255,255,0.02)',
          border: `1px solid ${state.activeStems.includes(stem.key) ? STEM_COLORS[stem.key].border : 'rgba(255,255,255,0.06)'}`,
        }"
        @click="toggleStem(stem.key)"
      >
        <div class="h-2 w-2 rounded-full" :style="{ backgroundColor: STEM_COLORS[stem.key].border }" />
        {{ stem.label }}
      </button>
    </div>

    <div class="flex items-center gap-3">
      <button
        class="flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-colors duration-300"
        :class="canSeparate() && !isRunning()
          ? 'bg-brand-pink text-white hover:bg-brand-pink-hover active:bg-brand-pink-active'
          : 'cursor-not-allowed bg-brand-pink text-white opacity-50'"
        :disabled="!canSeparate() || isRunning()"
        @click="handleSeparate"
      >
        <Loader2 v-if="isRunning()" class="h-4 w-4 animate-spin" />
        <Play v-else class="h-4 w-4" />
        <template v-if="state.separationStatus === 'uploading'">{{ t('sep.uploading') }}</template>
        <template v-else-if="state.separationStatus === 'processing'">{{ t('sep.processing', { p: Math.round(state.separationProgress) }) }}</template>
        <template v-else>{{ t('sep.start') }}</template>
      </button>

      <button
        v-if="isRunning()"
        class="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.10] text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white/80"
        :aria-label="t('sep.stop')"
        :title="t('sep.stop')"
        @click="handleStop"
      >
        <Square class="h-4 w-4" />
      </button>
    </div>

    <div
      v-if="state.separationStatus === 'processing' || state.separationStatus === 'uploading'"
      class="space-y-1.5"
      role="status"
      aria-live="polite"
    >
      <div
        class="h-1 overflow-hidden rounded-full bg-white/[0.06]"
        role="progressbar"
        :aria-valuenow="Math.round(state.separationProgress)"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="t('sep.progress')"
      >
        <div
          class="h-full rounded-full bg-gradient-to-r from-[#4f8fff] to-[#e04090] transition-all duration-500"
          :style="{ width: `${state.separationProgress}%` }"
        />
      </div>
      <div class="flex justify-between text-xs text-white/50">
        <span>{{ t('sep.progress') }}</span>
        <span>{{ Math.round(state.separationProgress) }}%</span>
      </div>
    </div>

    <div
      v-if="state.separationStatus === 'error' && state.separationError"
      class="rounded-[28px] border border-semantic-error/20 bg-semantic-error/10 px-4 py-3 text-sm font-medium text-semantic-error"
      role="alert"
    >
      {{ state.separationError }}
    </div>
  </div>
</template>
