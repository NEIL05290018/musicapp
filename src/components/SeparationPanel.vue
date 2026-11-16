<script setup lang="ts">
import { computed } from 'vue'
import { Play, Sparkles, Loader2 } from 'lucide-vue-next'
import { useAudioStore } from '@/composables/useAudioStore'
import { separate, retrySeparation } from '@/composables/useSeparationTask'
import { STEM_COLORS, formatTime } from '@/composables/useAudioUtils'
import { libraryFeedback, archiveMaterial, libraryOwner, library } from '@/composables/usePersonalLibrary'
import { useRouter } from 'vue-router'
import { t } from '@/i18n'
import type { StemType } from '@/composables/useAudioStore'
const router = useRouter()
async function saveMaterial() {
  if (!state.audioFile || !state.taskId || !state.resultRange) return
  try { await archiveMaterial(libraryOwner.value, state.taskId, state.audioFile, state.resultRange, state.results); libraryFeedback.error = '' }
  catch { libraryFeedback.error = 'personal.archiveError' }
}
const { state, toggleStem } = useAudioStore()
const STEMS = computed(() => (['vocals', 'music', 'sfx'] as StemType[]).map(key => ({ key, label: t('stem.' + key) })))
const canSeparate = () => state.audioBuffer && state.activeStems.length > 0
const isRunning = () => state.separationStatus === 'processing' || state.separationStatus === 'uploading'
const submitted = computed(() => state.submission && state.separationStatus !== 'idle')
const displayRange = computed(() => submitted.value ? state.submission!.range : state.timeSelections[0])
function goToPlayer() {
  document.getElementById('workspace-player')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}
</script>

<template>
  <div class="glass-card flex flex-col gap-4 p-4">
    <div class="flex items-center gap-2">
      <Sparkles class="h-4 w-4 text-[#e04090]" />
      <span class="text-xs font-semibold text-ink-secondary">{{ t('sep.title') }}</span>
      <span class="ml-auto rounded-full bg-[#e04090]/15 px-2 py-0.5 text-xs font-medium text-[#e04090]">Demucs v4</span>
    </div>

    <div class="space-y-1 text-sm" data-testid="task-summary">
      <p>{{ submitted ? state.submission?.fileName : state.audioFile?.name }}</p>
      <p>{{ submitted ? t('p0.submittedRange') : t('work.submitRange') }} {{ formatTime(displayRange?.startTime ?? 0) }} – {{ formatTime(displayRange?.endTime ?? state.audioDuration) }}</p>
      <p v-if="submitted">{{ state.submission?.stems.map(stem => t('stem.' + stem)).join(' · ') }}</p>
    </div>
    <p v-if="isRunning()" class="text-sm">{{ t('p0.processingHint') }}</p>
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
        :disabled="isRunning()" @click="toggleStem(stem.key)"
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
        @click="separate()"
      >
        <Loader2 v-if="isRunning()" class="h-4 w-4 animate-spin" />
        <Play v-else class="h-4 w-4" />
        <template v-if="state.separationStatus === 'uploading'">{{ t('sep.uploading') }}</template>
        <template v-else-if="state.separationStatus === 'processing'">{{ t('sep.processing', { p: Math.round(state.separationProgress) }) }}</template>
        <template v-else>{{ t('sep.start') }}</template>
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

    <div v-if="state.separationStatus === 'done'" class="flex flex-wrap items-center justify-between gap-3" role="status">
      <p>{{ t('p0.complete') }}</p><button v-if="!library.assets.some(asset => asset.id === state.taskId)" class="workspace-button" :disabled="libraryFeedback.saving > 0" @click="saveMaterial">{{ t('personal.saveMaterials') }}</button><button class="workspace-button" @click="router.push('/profile')">{{ t('personal.openMaterials') }}</button><button class="workspace-button" @click="goToPlayer">{{ t('p0.listenResults') }}</button>
    </div>
    <p v-if="libraryFeedback.saving" class="text-sm" role="status">{{ t('personal.savingAudio') }}</p>
    <div v-if="libraryFeedback.error" class="text-sm" role="alert">{{ t(libraryFeedback.error) }} <button class="underline" @click="saveMaterial">{{ t('work.retry') }}</button></div>
    <div
      v-if="state.separationStatus === 'error' && state.separationError"
      class="rounded-[28px] border border-semantic-error/20 bg-semantic-error/10 px-4 py-3 text-sm font-medium text-semantic-error"
      role="alert"
    >
      <p>{{ t('p0.failure.' + state.separationFailure) }}</p>
      <details v-if="state.separationError" class="mt-2 text-xs"><summary>{{ t('p0.details') }}</summary>{{ state.separationError }}</details>
      <button class="workspace-button mt-3" @click="retrySeparation()">{{ state.separationFailure === 'status' ? t('p0.resume') : t('p0.retryTask') }}</button>
    </div>
  </div>
</template>
