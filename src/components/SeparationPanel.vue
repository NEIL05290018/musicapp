<script setup lang="ts">
import { computed } from 'vue'
import { Loader2, Check } from 'lucide-vue-next'
import { useAudioStore } from '@/composables/useAudioStore'
import { separate, retrySeparation } from '@/composables/useSeparationTask'
import { formatTime } from '@/composables/useAudioUtils'
import { libraryFeedback, archiveMaterial, libraryOwner, library } from '@/composables/usePersonalLibrary'
import { useRouter } from 'vue-router'
import { t } from '@/i18n'
import type { StemType } from '@/composables/useAudioStore'
const router = useRouter()
const { state, toggleStem } = useAudioStore()
const stems: StemType[] = ['vocals', 'music', 'sfx']
const running = computed(() => ['processing', 'uploading'].includes(state.separationStatus))
const submitted = computed(() => state.submission && state.separationStatus !== 'idle')
const displayRange = computed(() => submitted.value ? state.submission!.range : state.timeSelections[0])
const canSeparate = computed(() => !!state.audioBuffer && state.activeStems.length > 0 && !running.value)
async function saveMaterial() {
  if (!state.audioFile || !state.taskId || !state.resultRange) return
  try { await archiveMaterial(libraryOwner.value, state.taskId, state.audioFile, state.resultRange, state.results); libraryFeedback.error = '' }
  catch { libraryFeedback.error = 'personal.archiveError' }
}
function goToPlayer() { document.getElementById('workspace-player')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }) }
</script>
<template>
  <div class="glass-card bench-separation">
    <div class="bench-task-range" data-testid="task-summary"><p>{{ submitted ? t('p0.submittedRange') : t('work.submitRange') }}</p><strong>{{ formatTime(displayRange?.startTime ?? 0) }} – {{ formatTime(displayRange?.endTime ?? state.audioDuration) }}</strong><span>{{ ((displayRange?.endTime ?? state.audioDuration) - (displayRange?.startTime ?? 0)).toFixed(1) }} s</span><p v-if="running">{{ state.submission?.fileName }}</p></div>
    <p v-if="running" class="bench-task-note">{{ t('p0.processingHint') }}</p>
    <details class="bench-output-options"><summary>{{ t('bench.outputs') }}<span>{{ state.activeStems.length }} / 3</span></summary><p>{{ t('bench.outputsHint') }}</p><label v-for="stem in stems" :key="stem"><input type="checkbox" :checked="state.activeStems.includes(stem)" :disabled="running" @change="toggleStem(stem)" />{{ t('stem.' + stem) }}</label></details>
    <p class="bench-task-stems">{{ (running ? state.submission!.stems : state.activeStems).map(stem => t('stem.' + stem)).join(' · ') }}</p>
    <p v-if="!state.activeStems.length" class="bench-task-note">{{ t('bench.chooseOutput') }}</p>
    <button :class="[state.separationStatus === 'done' ? 'workspace-button' : 'workspace-primary', 'bench-separate-button']" :disabled="!canSeparate" @click="separate()"><Loader2 v-if="running" class="animate-spin" aria-hidden="true" />{{ state.separationStatus === 'uploading' ? t('sep.uploading') : state.separationStatus === 'processing' ? t('sep.processing', { p: Math.round(state.separationProgress) }) : state.separationStatus === 'done' ? t('bench.separateAgain') : t('sep.start') }}</button>
    <div v-if="running" class="bench-task-progress" role="status" aria-live="polite"><div role="progressbar" :aria-valuenow="Math.round(state.separationProgress)" aria-valuemin="0" aria-valuemax="100" :aria-label="t('sep.progress')"><span :style="{ width: state.separationProgress + '%' }" /></div><p>{{ t('sep.progress') }} {{ Math.round(state.separationProgress) }}%</p></div>
    <div v-if="state.separationStatus === 'done'" class="bench-task-complete" role="status"><p><Check aria-hidden="true" />{{ t('p0.complete') }}</p><button class="workspace-button" @click="goToPlayer">{{ t('p0.listenResults') }}</button><button v-if="!library.assets.some(asset => asset.id === state.taskId)" class="workspace-button" :disabled="libraryFeedback.saving > 0" @click="saveMaterial">{{ t('personal.saveMaterials') }}</button><button class="bench-text-link" @click="router.push('/profile')">{{ t('personal.openMaterials') }}</button></div>
    <p v-if="libraryFeedback.saving" class="bench-task-note" role="status">{{ t('personal.savingAudio') }}</p>
    <div v-if="libraryFeedback.error" role="alert">{{ t(libraryFeedback.error) }} <button class="underline" @click="saveMaterial">{{ t('work.retry') }}</button></div>
    <div v-if="state.separationStatus === 'error'" class="bench-task-error" role="alert"><p>{{ t('p0.failure.' + state.separationFailure) }}</p><button class="workspace-button" @click="retrySeparation()">{{ state.separationFailure === 'status' ? t('p0.resume') : t('p0.retryTask') }}</button><details v-if="state.separationError"><summary>{{ t('p0.details') }}</summary>{{ state.separationError }}</details></div>
  </div>
</template>
